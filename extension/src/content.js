(() => {
  const site = location.host;

  function q(sel, root = document) { return root.querySelector(sel); }
  function createEl(tag, attrs = {}, html = "") {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    if (html) el.innerHTML = html;
    return el;
  }
  function escapeHtml(s) { if (s === undefined || s === null) return ""; return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

  function captureFrom(form) {
    const inputs = form.querySelectorAll('input');
    let email = "", password = "", username = "";
    inputs.forEach(i => {
      const type = (i.type || "").toLowerCase();
      const name = (i.name || i.placeholder || i.id || "").toLowerCase();
      const val = (i.value || "").trim();
      if (val && (type === "email" || /email/i.test(name))) email = val;
      if (val && (type === "password" || /pass|pwd/i.test(name))) password = val;
      if (val && !email.includes("@") && /user|name/i.test(name)) username = val;
    });
    if (password && (email || username)) return { site, email, username, password };
    return null;
  }

  function setPending(payload) {
  try {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.id && // check runtime still valid
      chrome.storage?.local
    ) {
      chrome.storage.local.set({ pending: payload }, () => {
        if (chrome.runtime.lastError) console.warn("set pending error:", chrome.runtime.lastError.message);
        else console.log("[content] pending set");
      });
    } else {
      console.warn("Extension context invalid or unavailable.");
    }
  } catch (e) {
    console.warn("setPending failed:", e);
  }
}


  function clearPending() {
    try { if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) chrome.storage.local.remove("pending"); }
    catch (e) {}
  }

  function showInPageSavePopup(payload, timeoutMs = 60000) { // 60s
    return new Promise((resolve) => {
      if (document.getElementById("pw-save-inpage")) return resolve({ action: "notnow" });

      const wrapper = createEl("div", { id: "pw-save-inpage" });
      wrapper.style.cssText = `
        position: fixed; right: 20px; top: 20px; width: 380px; max-width: calc(100% - 40px);
        background: #0f1724; color: #fff; padding: 18px; border-radius: 12px; z-index: 2147483647;
        box-shadow: 0 20px 60px rgba(2,6,23,0.6); font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;
      `;

      const header = createEl("div", {}, `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="font-size:16px">Save password?</strong>
          <button id="pw-close" aria-label="Close" style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer">✕</button>
        </div>
      `);

      const info = createEl("div", {}, `
        <div style="font-size:13px;color:#cbd5e1;margin-bottom:8px;">
          <div><strong>Site:</strong> ${escapeHtml(payload.site)}</div>
          <div style="margin-top:6px;"><strong>User:</strong> ${escapeHtml(payload.email || payload.username || "")}</div>
        </div>
        <div style="background:#111827;padding:10px;border-radius:8px;font-family:monospace;margin-bottom:12px;">
          ${escapeHtml(payload.password)}
        </div>
      `);

      const actions = createEl("div", {}, `
        <div style="display:flex;gap:10px;">
          <button id="pw-save-btn" style="flex:1;padding:10px;border-radius:8px;border:0;background:#10b981;color:white;cursor:pointer;font-weight:600">Save</button>
          <button id="pw-notnow-btn" style="flex:1;padding:10px;border-radius:8px;border:0;background:#ef4444;color:white;cursor:pointer;font-weight:600">Not Now</button>
        </div>
      `);

      wrapper.appendChild(header);
      wrapper.appendChild(info);
      wrapper.appendChild(actions);
      (document.body || document.documentElement).appendChild(wrapper);

      const cleanup = () => { try { wrapper.remove(); } catch (e) {} };
      const finish = (result) => { cleanup(); resolve(result); };

      // Close or 'Not Now' should remove popup silently
      q("#pw-close", wrapper).addEventListener("click", () => finish({ action: "notnow" }));
      q("#pw-notnow-btn", wrapper).addEventListener("click", () => finish({ action: "notnow" }));

      // Save button handler
     // ...existing code as before, with only change in save button handler:

q("#pw-save-btn", wrapper).addEventListener("click", async () => {
  q("#pw-save-btn", wrapper).disabled = true;
  q("#pw-save-btn", wrapper).textContent = "Saving...";
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "SAVE_FROM_PAGE", payload }, (resp) => {});
    } else {
      try {
        fetch("http://localhost:5000/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site: payload.site, email: payload.email, username: payload.username, iv: "", ciphertext: "", password: payload.password })
        });
      } catch (err) { console.warn("fallback save failed:", err); }
    }
  } finally {
    alert("Password saved!");
    finish({ action: "save" });
    // Redirect after saving:
    window.location.href = "/test-login"; // redirect to login page
  }
});

      const timer = setTimeout(() => finish({ action: "timeout" }), timeoutMs);
      const origResolve = resolve;
      resolve = (v) => { clearTimeout(timer); origResolve(v); };
    });
  }

  document.addEventListener("submit", async (e) => {
    try {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Do NOT show the save popup on dedicated login / logged-in pages
      if (location.pathname === "/test-login" || location.pathname === "/test-loggedin") {
        return; // let the page handle the submit normally
      }

      const passField = form.querySelector('input[type="password"], input[name*="pass" i], input[id*="pass" i]');
      if (!passField) return;

      const payload = captureFrom(form);
      if (!payload) return;

      e.preventDefault();
      try { e.stopImmediatePropagation(); e.stopPropagation(); } catch (_) {}

      setPending(payload);
      const res = await showInPageSavePopup(payload, 60000); // wait up to 60s
      clearPending();

      try {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) submitBtn.click();
        else {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          setTimeout(() => { try { if (typeof form.submit === "function") form.submit(); } catch(e) {} }, 40);
        }
      } catch (err) {
        console.warn("programmatic submit failed:", err);
        setTimeout(() => { if (location.pathname !== '/test-loggedin') location.href = "/test-loggedin"; }, 400);
      }
    } catch (err) {
      console.error("content submit intercept error:", err);
    }
  }, true);

  window.__pw_content_debug = { captureFrom, showInPageSavePopup, setPending, clearPending };
})();
