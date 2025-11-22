import React from "react";

const boxStyle: React.CSSProperties = {
  maxWidth: 420,
  margin: "80px auto",
  padding: 40,
  borderRadius: 24,
  boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
  background: "linear-gradient(135deg, #22c1c3 0%, #fdbb2d 100%)",
  color: "#ffffff",
  textAlign: "center",
  fontFamily: "Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: "14px 28px",
  borderRadius: 9999,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "1rem",
  background: "rgba(255,255,255,0.9)",
  color: "#1e293b",
};

export default function LoginSuccess() {
  return (
    <div style={boxStyle}>
      <h1 style={{ marginBottom: 12 }}>Welcome, you are logged in!</h1>
      <p style={{ opacity: 0.9 }}>
        You can now safely use your Password Wallet extension.
      </p>
      <button
        style={buttonStyle}
        onClick={() => window.close?.()}
      >
        Close this page
      </button>
    </div>
  );
}
