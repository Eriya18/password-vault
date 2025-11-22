import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./Vault.module.css";

const Vault: React.FC = () => {
  const [vault, setVault] = useState({});
  const [masterPw, setMasterPw] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const fetchVault = async () => {
    try {
      const response = await axios.get("http://localhost:8000/vault", {
        params: { master_pw: masterPw },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setVault(response.data);
      setMessage("Vault loaded successfully!");
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Failed to load vault!");
    }
  };

  return (
    <div className={styles.vaultContainer}>
      <h2 className={styles.title}>Vault</h2>
      {message && <p className={styles.message}>{message}</p>}
      <input
        type="password"
        placeholder="Enter Master Password"
        value={masterPw}
        onChange={(e) => setMasterPw(e.target.value)}
        className={styles.input}
      />
      <button onClick={fetchVault} className={styles.button}>
        Load Vault
      </button>
      <ul className={styles.vaultList}>
        {Object.entries(vault).map(([site, data]) => (
          <li key={site} className={styles.vaultItem}>
            {site}: {data.username} / {data.password}
          </li>
        ))}
      </ul>
      <button onClick={() => navigate("/login")} className={styles.button}>
        Logout
      </button>
    </div>
  );
};

export default Vault;