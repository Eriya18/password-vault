import React, { useState, FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./ForgotPassword.module.css";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleResetRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    try {
      // Placeholder API call - In a real app, this would send an email
      await axios.post("http://localhost:8000/forgot-password", { email }, {
        headers: { "Content-Type": "application/json" },
      });
      setMessage("Password reset link sent to your email! Check your inbox.");
      setTimeout(() => navigate("/login"), 3000); // Redirect after 3 seconds
      setEmail("");
    } catch (err: any) {
      console.error("Error details:", err.response?.data);
      setMessage("Error sending reset link! Please ensure the email is registered.");
    }
  }

  return (
    <div className={styles.forgotPasswordContainer}>
      <h2 className={styles.title}>Forgot Password</h2>
      {message && <p className={styles.message}>{message}</p>}
      <form onSubmit={handleResetRequest} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <button type="submit" className={styles.resetButton}>
          Send Reset Link
        </button>
        <div className={styles.links}>
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>Back to Login</a>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Back to Home</a>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;