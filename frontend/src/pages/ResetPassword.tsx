import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./ResetPassword.module.css";

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing token!");
    }
  }, [token]);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }
    try {
      await axios.post("http://localhost:8000/reset-password", { token, new_password: password }, {
        headers: { "Content-Type": "application/json" },
      });
      setMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      console.error("Error details:", err.response?.data);
      setMessage(err.response?.data.detail || "Reset failed!");
    }
  }

  return (
    <div className={styles.resetContainer}>
      <h2 className={styles.title}>Reset Password</h2>
      {message && <p className={styles.message}>{message}</p>}
      <form onSubmit={handleReset} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>New Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <button type="submit" className={styles.resetButton}>
          Reset Password
        </button>
        <div className={styles.links}>
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>Back to Login</a>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Back to Home</a>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;