import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap } from "lucide-react";
import styles from "./Register.module.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  const navigate = useNavigate();

  // ... existing calculateStrength, generatePassword, handleSubmit stay the same ...

  return (
    <div className={styles["register-container"]}>
      <h1 className={styles["register-title"]}>Create Account</h1>
      <form onSubmit={handleSubmit}>
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
              onChange={(e) => {
                setPassword(e.target.value);
                setStrength(calculateStrength(e.target.value));
              }}
              placeholder="Strong password"
              autoComplete="new-password"
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

        <div className={styles["strength-box"]}>
          <div className={styles["strength-bars"]}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`${styles.bar} ${i < strength ? styles.filled : ""}`}
              />
            ))}
          </div>
          <span
            className={`${styles["strength-text"]} ${
              strength <= 2 ? styles.weak : strength <= 4 ? styles.medium : styles.strong
            }`}
          >
            {strength <= 2 ? "Weak" : strength <= 4 ? "Medium" : "Strong"}
          </span>
        </div>

        <div className={styles["btn-group"]}>
          <button
            type="button"
            onClick={generatePassword}
            className={`${styles.btn} ${styles.generate}`}
          >
            <Zap size={18} /> Generate
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.register} ${
              strength === 5 ? styles.enabled : ""
            }`}
            disabled={strength < 5}
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
}