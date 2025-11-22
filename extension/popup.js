// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", main);

function $ (sel) { return document.querySelector(sel); }
function el(tag, attrs={}, html="") {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if (html) e.innerHTML = html;
  return e;
}
function b64ToArr(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }
function arrToB64(arr) { return btoa(String.fromCharCode(...arr)); }

let masterKey = null;

async function getMasterKeyWithRetry(retries=20, delay=150){
  for (let i=0; i<retries; i++){
    const b64 = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: "GET_KEY" }, resp => resolve(resp));
    });
    if (b64) {
      try {
        const key = await crypto.subtle.importKey("raw", b64ToArr(b64), "AES-GCM", false, ["encrypt","decrypt"]);
        masterKey = key;
        return key;
      } catch (err) {
        console.warn("popup importKey failed:", err);
      }
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error("Could not obtain master key");
}

async function decryptEntry(ivB64, ctB64){
  // Guard: if we have no IV/ciphertext, this entry was stored in a legacy/plain format.
  if (!ivB64 || !ctB64) {
    throw new Error("Missing ciphertext");
  }
  if (!masterKey) await getMasterKeyWithRetry();
  const iv = b64ToArr(ivB64);
  const ct = b64ToArr(ctB64);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, ct);
  return new TextDecoder().decode(plainBuf);
}

// Safe showStatus: no crash if #status missing
function showStatus(msg){
  const s = $("#status");
  if (s) s.textContent = msg;
  else console.debug("[popup] status:", msg);
}

async function main(){
  showStatus("Loading...");
  const refreshBtn = $("#refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", loadList);
  try {
    await loadList();
  } catch (err) {
    console.error("loadList failed:", err);
    showStatus("Load failed");
  }
}

function escapeHtml(s){ if (s===undefined||s===null) return ""; return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

function renderList(list){
  const container = $("#list");
  if (!container) {
    console.warn("popup: #list element missing");
    return;
  }
  container.innerHTML = "";
  if (!list || !list.length) {
    container.innerHTML = '<div id="empty" style="padding:12px;color:#9aa7b8">No saved passwords</div>';
    showStatus("");
    return;
  }
  showStatus("");
  list.forEach(entry => {
    const card = el("div", { class: "card" });
    card.style = "display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);margin-bottom:8px;";
    const left = el("div", { style:"display:flex;gap:10px;align-items:center" });
    const avatar = el("div", { style:"width:36px;height:36px;border-radius:8px;background:#0ea5a4;display:flex;align-items:center;justify-content:center;color:white;font-weight:700" }, (entry.email||entry.username||entry.site||"")[0]?.toUpperCase() || "?");
    const meta = el("div", {}, `<div style="font-weight:700">${escapeHtml(entry.site)}</div><div style="font-size:12px;color:#9aa7b8">${escapeHtml(entry.email||entry.username||"")}</div>`);
    left.appendChild(avatar); left.appendChild(meta);

    const controls = el("div", { style:"display:flex;gap:8px;align-items:center" });
    const pwdSpan = el("div", { style:"font-family:monospace;padding:6px;border-radius:6px;background:rgba(255,255,255,0.02)" }, "••••••••");
    const showBtn = el("button", { class:"show" }, "Show");
    const copyBtn = el("button", { class:"copy" }, "Copy");
    const delBtn = el("button", { class:"del" }, "Delete");

    controls.appendChild(pwdSpan); controls.appendChild(showBtn); controls.appendChild(copyBtn); controls.appendChild(delBtn);

    card.appendChild(left); card.appendChild(controls);
    container.appendChild(card);

    // decrypt in background
    (async () => {
      try {
        // Skip old/legacy entries that don't have encrypted data
        if (!entry.iv || !entry.ciphertext) {
          showBtn.dataset.error = "1";
          return;
        }
        const pwd = await decryptEntry(entry.iv, entry.ciphertext);
        showBtn.dataset.pwd = pwd;
        copyBtn.dataset.pwd = pwd;
      } catch (err) {
        console.warn("decrypt failed for", entry.site, entry.email, err && err.message);
        showBtn.dataset.error = "1";
      }
    })();

    showBtn.addEventListener("click", () => {
      if (showBtn.dataset.error) { alert("Cannot decrypt (key not available)"); return; }
      pwdSpan.textContent = showBtn.dataset.pwd || "••••••••";
    });

    copyBtn.addEventListener("click", () => {
      const txt = copyBtn.dataset.pwd || "";
      if (!txt) { alert("Nothing to copy"); return; }
      navigator.clipboard.writeText(txt).then(() => alert("Copied!"), () => alert("Copy failed"));
    });

    delBtn.addEventListener("click", () => {
      if (!confirm("Delete this entry?")) return;
      chrome.runtime.sendMessage({ type: "DELETE_PASSWORD", site: entry.site, email: entry.email }, () => {
        loadList();
      });
    });
  });
}

async function loadList(){
  showStatus("Loading saved passwords...");
  chrome.runtime.sendMessage({ type: "LIST_PASSWORDS" }, (resp) => {
    const list = (resp && resp.list) ? resp.list : [];
    renderList(list);
  });
}