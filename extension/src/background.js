// background.js (service worker)
const MASTER_KEY_STORAGE = "master_key_b64";

function b64ToU8(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function u8ToB64(u8) { return btoa(String.fromCharCode(...u8)); }

async function generateAndStoreKey() {
  const raw = crypto.getRandomValues(new Uint8Array(32)); // 256-bit
  const b64 = u8ToB64(raw);
  try { await chrome.storage.local.set({ [MASTER_KEY_STORAGE]: b64 }); } catch(e){}
  return b64;
}

function getMasterKeyBase64() {
  return new Promise((resolve) => {
    chrome.storage.local.get(MASTER_KEY_STORAGE, async (res) => {
      if (res && res[MASTER_KEY_STORAGE]) return resolve(res[MASTER_KEY_STORAGE]);
      const b64 = await generateAndStoreKey();
      resolve(b64);
    });
  });
}

async function importKeyFromB64(b64) {
  const raw = b64ToU8(b64);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
}

async function encryptString(plain) {
  const b64 = await getMasterKeyBase64();
  const key = await importKeyFromB64(b64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return { iv: u8ToB64(iv), ciphertext: u8ToB64(new Uint8Array(encBuf)) };
}

self.addEventListener('install', ev => {
  ev.waitUntil(getMasterKeyBase64());
  self.skipWaiting();
});
self.addEventListener('activate', ev => { ev.waitUntil(self.clients.claim()); });

// helper to reply async
function respondAsync(sendResponse, promise) {
  promise.then(res => sendResponse(res)).catch(err => sendResponse({ error: err && err.message }));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.type) return sendResponse && sendResponse(null);

      if (msg.type === "GET_KEY") {
        const b64 = await getMasterKeyBase64();
        sendResponse && sendResponse(b64);
        return;
      }

      if (msg.type === "SET_PENDING") {
        // store pending object (simple copy) in chrome.storage.local so popup/content can read it
        try {
          chrome.storage.local.set({ pending: msg.payload }, () => {
            // ignore errors
            sendResponse && sendResponse({ success: true });
          });
        } catch (e) {
          sendResponse && sendResponse({ success: false, error: e && e.message });
        }
        return;
      }

      if (msg.type === "GET_PENDING") {
        chrome.storage.local.get("pending", res => {
          sendResponse && sendResponse(res.pending || null);
        });
        return;
      }

      if (msg.type === "SAVE_FROM_PAGE" || msg.type === "SAVE_LOGIN" || msg.type === "SAVE_FROM_CONTENT") {
        const payload = msg.payload || {};
        const plain = payload.password || payload.pass || "";
        const site = payload.site || (sender?.tab?.url ? new URL(sender.tab.url).host : "localhost");
        const email = payload.email || "";
        const username = payload.username || "";

        if (!plain) {
          sendResponse && sendResponse({ success: false, error: "no_password" });
          return;
        }

        try {
          const enc = await encryptString(plain);
          await fetch("http://localhost:5000/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ site, email, username, iv: enc.iv, ciphertext: enc.ciphertext })
          });
        } catch (err) {
          console.error("background: save POST failed", err);
        }

        // clear pending
        try { chrome.storage.local.remove("pending"); } catch (e){}
        sendResponse && sendResponse({ success: true });
        return;
      }

      if (msg.type === "LIST_PASSWORDS") {
        try {
          const resp = await fetch("http://localhost:5000/list", { cache: "no-store" });
          const json = await resp.json();
          sendResponse && sendResponse({ list: json });
        } catch (err) {
          console.error("background: LIST failed", err);
          sendResponse && sendResponse({ list: [] });
        }
        return;
      }

      if (msg.type === "DELETE_PASSWORD") {
        try {
          await fetch("http://localhost:5000/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ site: msg.site, email: msg.email })
          });
        } catch (err) {
          console.error("background: delete failed", err);
        }
        sendResponse && sendResponse({ success: true });
        return;
      }

    } catch (err) {
      console.error("background handler error", err);
      sendResponse && sendResponse({ success: false, error: err && err.message });
    }
  })();
  return true; // keep sendResponse alive
});
