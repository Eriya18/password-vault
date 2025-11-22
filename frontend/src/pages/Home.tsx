import React from "react";
import { Link } from "react-router-dom";
import styles from "./Home.module.css";

const Home: React.FC = () => {
  return (
    <div className={styles.homeContainer}>
      <h1>Welcome to Password Wallet</h1>
      <p>Your secure password manager.</p>
      <div className={styles.links}>
        <Link to="/register" className={styles.linkButton}>Register Here</Link>
        <Link to="/login" className={styles.linkButton}>Login Here</Link>
      </div>
    </div>
  );
};

export default Home;