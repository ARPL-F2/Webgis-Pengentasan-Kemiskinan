import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "./assets/Front_image.png";
import logoImg from "./assets/Logo-Universitas-Tanjungpura.jpg";

export default function Landing() {
  const navigate = useNavigate();
  
  // --- BACKEND LOGIC ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // CORRECTED: Remove the duplicate function wrapper
  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Convert input to lowercase for easier matching
    const inputUser = email.trim().toLowerCase(); 
    const inputPass = password.trim();

    // 2. Logic for Admin
    if (inputUser === "admin" && inputPass === "password") {
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("userName", "Admin");
      navigate("/app"); 
    } 
    // 3. Logic for User
    else if (inputUser === "user" && inputPass === "password") {
      localStorage.setItem("userRole", "user");
      localStorage.setItem("userName", "User");
      navigate("/user");
    } 
    // 4. Failed Login
    else {
      alert("Username atau Password salah!");
      setLoading(false); // Reset loading on failure
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* TOP IMAGE - EXACTLY AS YOU HAD IT */}
        <div style={styles.imageContainer}>
          <img src={heroImg} alt="school" style={styles.image} />
          <div style={styles.overlayText}>
            <h3 style={{ color: "#1e90ff", margin: 0 }}>Selamat Datang</h3>
            <p style={{ color: "#fff", margin: 0 }}>Web APP Webgis</p>
            <h4 style={{ color: "#fff", margin: 0 }}>Pengentasan Kemiskinan</h4>
          </div>
        </div>

        {/* LOGO - EXACTLY AS YOU HAD IT */}
        <div style={styles.logoContainer}>
          <img src={logoImg} alt="logo" style={{ width: 100 }} />
        </div>

        {/* TEXT - EXACTLY AS YOU HAD IT */}
        <div style={{ textAlign: "center", padding: "0 15px" }}>
          <h3>Silahkan Masuk & Verifikasi</h3>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Harap melakukan Login menggunakan role dan kata sandi
            untuk mengakses fitur & layanan
          </p>
        </div>

        {/* REPLACING OLD BUTTONS WITH FUNCTIONAL LOGIN */}
        <form onSubmit={handleLogin} style={styles.formContainer}>
          <input 
            type="text" // CHANGED FROM "email" TO "text"
            placeholder="Role anda" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.inputField}
            required
          />
          <input 
            type="password" 
            placeholder="Kata Sandi" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.inputField}
            required
          />
          
          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
          </button>
        </form>

      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "linear-gradient(to bottom, #6aa9e9, #4a86c5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    width: "400px",
    background: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    paddingBottom: "30px" 
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: "250px", objectFit: "cover" },
  overlayText: { position: "absolute", bottom: "50px", left: "15px" }, 
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "-50px",
    marginBottom: "10px",
    position: "relative",
    zIndex: 2
  },
  // NEW STYLES TO MATCH YOUR BUTTON WIDTH
  formContainer: {
    width: "80%",
    margin: "20px auto 0",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  inputField: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    outline: "none"
  },
  loginBtn: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#1e90ff",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  }
};
