import { useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: emailData, error: lookupError } = await supabase.rpc(
        "get_email_by_username",
        { input_username: username }
      );

      if (lookupError || !emailData) {
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailData,
        password,
      });

      if (authError) {
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }

      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("role")
        .eq("username", username)
        .single();

      if (empError || !employee) {
        setError("Logged in, but couldn't load your profile. Contact admin.");
        setLoading(false);
        return;
      }

      if (employee.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!username) {
      setError("Enter your username to reset password.");
      return;
    }

    const { data: emailData } = await supabase.rpc(
      "get_email_by_username",
      { input_username: username }
    );

    if (!emailData) {
      setError("Username not found.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailData);
    if (error) {
      setError("Failed to send reset email: " + error.message);
    } else {
      alert("Password reset email sent! Check your inbox.");
    }
  };

  return (
    <div style={styles.container}>
      <img src="/pho-building.webp" alt="PHO Building" style={styles.buildingImg} />
      <div style={styles.overlay} />

      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/pho-seal.png" alt="PHO Seal" style={styles.sealImg} />
        </div>

        <h2 style={styles.title}>Proceed with your account</h2>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />

          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <span style={styles.showBtn} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "HIDE" : "SHOW"}
            </span>
          </div>

          <div style={styles.forgotRow}>
            <span style={styles.forgotText} onClick={handleForgotPassword}>
              Forgot Password?
            </span>
          </div>

          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    background: "#c8c8c8",
    fontFamily: "'Segoe UI', sans-serif",
  },
  buildingImg: {
    position: "absolute",
    bottom: "-5%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "85%",
    zIndex: 0,
    opacity: 0.95,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(200,200,200,0.3)",
    zIndex: 1,
  },
  card: {
    position: "relative",
    zIndex: 2,
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(10px)",
    borderRadius: 16,
    padding: "36px 40px",
    width: 340,
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.6)",
  },
  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 12,
  },
  sealImg: {
    width: 90,
    height: 90,
    objectFit: "contain",
  },
  title: {
    textAlign: "center",
    color: "#333",
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 20,
  },
  errorBox: {
    background: "rgba(255,0,0,0.1)",
    border: "1px solid rgba(255,0,0,0.3)",
    color: "#c0392b",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "rgba(255,255,255,0.7)",
    color: "#333",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  passwordWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  showBtn: {
    position: "absolute",
    right: 12,
    color: "#888",
    fontSize: 11,
    fontWeight: "bold",
    cursor: "pointer",
    userSelect: "none",
  },
  forgotRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    cursor: "pointer",
    color: "#888",
    fontSize: 12,
    textDecoration: "underline",
  },
  loginBtn: {
    background: "#c0392b",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontSize: 15,
    fontWeight: "bold",
    cursor: "pointer",
    letterSpacing: 1,
    marginTop: 4,
  },
};