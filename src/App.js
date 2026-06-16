import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import RadashiApp from './RadashiApp';

const COLORS = {
  bg: "#0A0A0A", surface: "#141414", card: "#1A1A1A",
  orange: "#FF6B00", gold: "#FFB800", text: "#F0F0F0",
  muted: "#888", border: "#2A2A2A", green: "#22C55E",
};

function LoginScreen({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Llena todos los campos"); return; }
    setLoading(true);
    setError("");
    try {
      if (modo === "registro") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("Este correo ya está registrado");
      else if (e.code === "auth/wrong-password") setError("Contraseña incorrecta");
      else if (e.code === "auth/user-not-found") setError("Usuario no encontrado");
      else if (e.code === "auth/weak-password") setError("La contraseña debe tener al menos 6 caracteres");
      else if (e.code === "auth/invalid-email") setError("Correo inválido");
      else setError("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 70, height: 70, borderRadius: 20, background: `linear-gradient(135deg, ${COLORS.orange}, #FF9500)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16 }}>⚙️</div>
      <div style={{ color: COLORS.orange, fontWeight: 900, fontSize: 24, letterSpacing: 2, marginBottom: 4 }}>ZONA RADASHI</div>
      <div style={{ color: COLORS.muted, fontSize: 14, marginBottom: 32 }}>Comunidad de moteros</div>

      <div style={{ width: "100%", maxWidth: 360, background: COLORS.card, borderRadius: 20, padding: 24, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", marginBottom: 20, background: COLORS.surface, borderRadius: 12, padding: 4 }}>
          {["login", "registro"].map(m => (
            <button key={m} onClick={() => setModo(m)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: modo === m ? COLORS.orange : "transparent", color: modo === m ? "#fff" : COLORS.muted, fontWeight: modo === m ? 700 : 400, fontSize: 14 }}>
              {m === "login" ? "Entrar" : "Registrarse"}
            </button>
          ))}
        </div>

        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" type="email" style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" type="password" style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />

        {error && <div style={{ color: "#FF4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", background: `linear-gradient(135deg, ${COLORS.orange}, #FF9500)`, border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
          {loading ? "Cargando..." : modo === "login" ? "Entrar 🏍️" : "Crear cuenta 🔥"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#FF6B00", fontSize: 48 }}>⚙️</div>
    </div>
  );

  if (!user) return <LoginScreen />;

  return <RadashiApp user={user} onLogout={() => signOut(auth)} />;
}

export default App;
