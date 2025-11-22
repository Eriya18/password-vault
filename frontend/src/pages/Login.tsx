import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    window.postMessage(
      {
        type: "CHECK_PASSWORD",
        payload: { email, password },
      },
      "*"
    );

    const handler = (event: MessageEvent) => {
      if (event.data.type === "LOGIN_RESULT") {
        if (event.data.success) {
          navigate("/welcome");
        } else {
          setError("Wrong email or password");
        }
        window.removeEventListener("message", handler);
      }
    };

    window.addEventListener("message", handler);
  };

  return (
    <div className={styles["login-container"]}>
      <h1 className={styles["login-title"]}>Welcome Back</h1>
      <form onSubmit={handleLogin}>
        <div className={styles["form-group"]}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className={styles["form-group"]}>
          <label>Password</label>
          <div className={styles["input-wrapper"]}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles["eye-btn"]}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {error && <p style={{ color: "#ffcccc", marginTop: 8 }}>{error}</p>}

        <button type="submit" className={`${styles.btn} ${styles.login}`}>
          Login
        </button>
      </form>
    </div>
  );
}