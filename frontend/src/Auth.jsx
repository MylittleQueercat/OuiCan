import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setLoading(true); setErr("");
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSent(true);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" },
    card: { background: "#FFF", padding: 40, borderRadius: 16, border: "1px solid #EAE2D5", width: "100%", maxWidth: 400 },
    title: { fontFamily: "'UnifrakturMaguntia', serif", fontSize: 48, color: "#123524", textAlign: "center", marginBottom: 8, textShadow: "1px 1px 0px rgba(0,0,0,0.1)" },
    sub: { fontFamily: "'Libre Baskerville', serif", fontSize: 12, textTransform: "uppercase", letterSpacing: 4, color: "#999", textAlign: "center", marginBottom: 32, fontStyle: "italic" },
    input: { width: "100%", padding: "14px", fontSize: 15, borderRadius: 10, border: "2px solid #EEE", marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "'Libre Baskerville', serif" },
    btn: { width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#123524", color: "#FFF", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 },
    toggle: { textAlign: "center", fontSize: 13, color: "#999", cursor: "pointer" },
    err: { color: "#993556", fontSize: 13, marginBottom: 12, fontFamily: "'Libre Baskerville', serif", fontStyle: "italic" },
  };

  if (sent) return (
    <div style={s.container}>
      <div style={{ ...s.card, textAlign: "center" }}>
        <div style={s.title}>OuiCan</div>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 15, color: "#444", lineHeight: 1.7 }}>
          ✉️ Vérifie ta boîte mail !<br />
          <span style={{ color: "#999", fontSize: 13 }}>Un lien de confirmation t'a été envoyé.</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.title}>OuiCan</div>
        <div style={s.sub}>Le Français par la curiosité</div>
        {err && <div style={s.err}>{err}</div>}
        <input style={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        <input style={s.input} type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        <button style={s.btn} onClick={submit} disabled={loading}>
          {loading ? "..." : isLogin ? "Se connecter" : "Créer un compte"}
        </button>
        <div style={s.toggle} onClick={() => { setIsLogin(!isLogin); setErr(""); }}>
          {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </div>
      </div>
    </div>
  );
}