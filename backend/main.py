from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

DB = "vault.db"

def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS passwords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site TEXT,
            email TEXT,
            username TEXT,
            iv TEXT,
            ciphertext TEXT
        )
    """)
    conn.commit()
    conn.close()
    print("DB ready")

init_db()

# === TEST PAGES ===
@app.route('/test')
def test_register():
    return '''
<!DOCTYPE html>
<html>
<head>
  <title>Register</title>
  <style>
    body{font-family:Arial;padding:40px;background:#f8fafc;text-align:center;}
    .box{max-width:400px;margin:auto;background:white;padding:32px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);}
    input{width:100%;padding:14px;margin:10px 0;border:1px solid #cbd5e1;border-radius:8px;font-size:16px;}
    .eye{position:relative;}
    .eye-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:20px;color:#64748b;}
    .strength{font-size:14px;margin:8px 0;}
    .strong{color:#10b981;font-weight:bold;}
    .weak{color:#ef4444;font-weight:bold;}
    button{width:100%;padding:14px;margin:12px 0;border:none;border-radius:8px;font-size:16px;cursor:pointer;}
    .gen{background:#3b82f6;color:white;}
    .reg{background:#10b981;color:white;}
    .disabled{background:#94a3b8;cursor:not-allowed;}
  </style>
</head>
<body>
  <div class="box">
    <h2>Create Account</h2>
    <form id="form">
      <input type="email" id="email" placeholder="Email" value="test@demo.com" required>
      <div class="eye">
        <input type="password" id="pass" placeholder="Password" value="MyPass123!" required>
        <span class="eye-icon" id="eye">Eye</span>
      </div>
      <div class="strength" id="strength">Strength: Checking...</div>
      <button type="button" class="gen" id="gen-btn">Generate Password</button>
      <button type="submit" class="reg" id="submit">Register</button>
    </form>
  </div>

  <script>
    // UI features: eye, generator, strength-checker (unchanged logic)
    const p = document.getElementById('pass');
    const e = document.getElementById('eye');
    const s = document.getElementById('strength');
    const b = document.getElementById('submit');
    const genBtn = document.getElementById('gen-btn');

    e.onclick = () => {
      if (p.type === 'password') { p.type = 'text'; e.innerHTML = 'Hide'; }
      else { p.type = 'password'; e.innerHTML = 'Eye'; }
    };

    function generatePassword() {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
      let pwd = "";
      for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
      p.value = pwd;
      checkStrength();
    }
    genBtn.onclick = generatePassword;

    function checkStrength() {
      const v = p.value;
      const len = v.length >= 8;
      const upper = /[A-Z]/.test(v);
      const lower = /[a-z]/.test(v);
      const digit = /[0-9]/.test(v);
      const special = /[!@#$%^&*()_+-=]/.test(v);
      const score = [len, upper, lower, digit, special].filter(Boolean).length;
      s.innerHTML = `Strength: <span class="${score >= 4 ? 'strong' : 'weak'}">${score >= 4 ? 'Strong' : 'Weak'}</span>`;
      b.disabled = score < 4;
      b.classList.toggle('disabled', score < 4);
    }
    p.oninput = checkStrength;
    checkStrength();

    // on submit — encrypt in page (using extension's GET_KEY) and set pending for extension
    document.getElementById('form').onsubmit = async (e) => {
      e.preventDefault();
      if (b.disabled) return;
      const email = document.getElementById('email').value.trim();
      const pass = p.value;
      const site = location.host;

      // request key from extension (background/service worker)
      // The service worker answers with base64 key (b64). For content script it will probably be available.
      let enc = { iv: "", ciphertext: "" };
      try {
        const keyData = await new Promise(r => {
          try { chrome.runtime.sendMessage({ type: "GET_KEY" }, r); }
          catch (err) { r(null); }
        });

        if (keyData) {
          // keyData could be base64 string OR raw array (older variants). handle both.
          let raw;
          if (typeof keyData === "string") {
            raw = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
          } else if (Array.isArray(keyData) || keyData instanceof Uint8Array) {
            raw = new Uint8Array(keyData);
          } else {
            raw = null;
          }
          if (raw) {
            const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt"]);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(pass));
            enc = {
              iv: btoa(String.fromCharCode(...iv)),
              ciphertext: btoa(String.fromCharCode(...new Uint8Array(encBuf)))
            };
          }
        }
      } catch (err) {
        console.warn("Encrypt in page failed:", err);
      }

      // send SET_PENDING (so extension popup and background know)
      try {
        chrome.runtime.sendMessage({ type: "SET_PENDING", payload: { site, email, username: "", iv: enc.iv, ciphertext: enc.ciphertext, password: pass } });
      } catch (err) { console.warn("SET_PENDING send failed:", err); }

      // give extension a moment to show popup, then redirect to login page
      setTimeout(() => location.href = "/test-login", 700);
    };
  </script>
</body>
</html>
    '''

@app.route('/test-login')
def test_login():
    return '''
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      background: #e0f2fe;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .box {
      max-width: 420px;
      width: 100%;
      margin-top: 40px;
      background: #ffffff;
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      box-sizing: border-box;
    }

    h2 {
      text-align: center;
      margin-top: 4px;
      margin-bottom: 24px;
      font-size: 24px;
    }

    label {
      display: block;
      margin: 10px 0 6px;
      font-weight: 600;
      color: #0f172a;
      font-size: 14px;
    }

    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 15px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 1px rgba(59,130,246,0.3);
      background: #ffffff;
    }

    .eye-wrapper {
      position: relative;
      width: 100%;
      margin-top: 4px;
    }

    .eye-wrapper input {
      padding-right: 80px; /* space for the Show button */
    }

    #eye-toggle {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      padding: 6px 12px;
      border-radius: 999px;
      border: none;
      background: #10b981;
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
    }

    #login-btn {
      width: 100%;
      padding: 14px;
      margin-top: 22px;
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
    }

    #login-btn:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(16,185,129,0.3);
    }
  </style>
</head>
<body>
  <div class="box">
    <h2>Login</h2>
    <form id="login-form">
      <label for="email">Email</label>
      <input id="email" type="email" placeholder="Email" value="test@demo.com" required>

      <label for="password">Password</label>
      <div class="eye-wrapper">
        <input id="password" type="password" placeholder="Password" value="MyPass123!" required>
        <button type="button" id="eye-toggle">Show</button>
      </div>

      <button id="login-btn" type="submit">Login</button>
    </form>
  </div>

<script>
  // Show / Hide password toggle
  const eyeBtn = document.getElementById('eye-toggle');
  const passInput = document.getElementById('password');

  eyeBtn.onclick = () => {
    if (passInput.type === 'password') {
      passInput.type = 'text';
      eyeBtn.textContent = 'Hide';
    } else {
      passInput.type = 'password';
      eyeBtn.textContent = 'Show';
    }
  };

  // Keep same redirect behaviour
  document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    setTimeout(() => location.href = '/test-loggedin', 400);
  };
</script>

</body>
</html>
    '''

# === API ENDPOINTS ===
@app.route('/save', methods=['POST'])
def save():
    try:
        data = request.get_json()
        site = data.get('site')
        email = data.get('email')
        username = data.get('username', "")
        iv = data.get('iv')
        ciphertext = data.get('ciphertext')

        conn = sqlite3.connect(DB)
        conn.execute(
            "INSERT OR REPLACE INTO passwords (site, email, username, iv, ciphertext) VALUES (?,?,?,?,?)",
            (site, email, username, iv, ciphertext)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        print("SAVE ERROR:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/list')
def list_all():
    try:
        conn = sqlite3.connect(DB)
        rows = conn.execute("SELECT site, email, username, iv, ciphertext FROM passwords").fetchall()
        conn.close()
        return jsonify([{"site": r[0], "email": r[1], "username": r[2], "iv": r[3], "ciphertext": r[4]} for r in rows])
    except Exception as e:
        print("LIST ERROR:", e)
        return jsonify([]), 500

@app.route('/delete', methods=['POST'])
def delete():
    try:
        data = request.get_json()
        conn = sqlite3.connect(DB)
        conn.execute("DELETE FROM passwords WHERE site=? AND email=?", (data['site'], data['email']))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        print("DELETE ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("RUNNING → http://localhost:5000/test")
    app.run(host='localhost', port=5000, debug=False)
