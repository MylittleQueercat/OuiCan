import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const LEVELS = [
  { value: "A1", label: "A1", desc: "Découverte" },
  { value: "A2", label: "A2", desc: "Élémentaire" },
  { value: "B1", label: "B1", desc: "Intermédiaire" },
  { value: "B2", label: "B2", desc: "Avancé" },
  { value: "C1", label: "C1", desc: "Autonome" },
  { value: "C2", label: "C2", desc: "Maîtrise" },
];

export default function Profile({ user, onSave }) {
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("nickname, level").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setNickname(data.nickname || "");
          setLevel(data.level || "");
        }
      });
  }, [user]);

  async function save() {
    if (!nickname.trim()) { setErr("Choisis un pseudo !"); return; }
    if (!level) { setErr("Choisis ton niveau !"); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      nickname: nickname.trim(),
      level,
    });
    if (error) { setErr(error.message); setLoading(false); return; }
    onSave({ nickname: nickname.trim(), level });
  }

  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" },
    card: { background: "#FFF", padding: 40, borderRadius: 16, border: "1px solid #EAE2D5", width: "100%", maxWidth: 440 },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 6 },
    sub: { fontSize: 13, color: "#999", marginBottom: 28, fontStyle: "italic", fontFamily: "'Libre Baskerville', serif" },
    label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#666", marginBottom: 8, display: "block" },
    input: { width: "100%", padding: "14px", fontSize: 15, borderRadius: 10, border: "2px solid #EEE", marginBottom: 20, boxSizing: "border-box", outline: "none", fontFamily: "'Libre Baskerville', serif" },
    levelGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 },
    levelBtn: (active) => ({ padding: "16px", borderRadius: 10, border: `2px solid ${active ? "#123524" : "#EEE"}`, background: active ? "#F0EDE7" : "#FFF", cursor: "pointer", textAlign: "center", transition: "0.15s" }),
    levelLabel: (active) => ({ fontSize: 20, fontWeight: 800, color: active ? "#123524" : "#999", display: "block" }),
    levelDesc: (active) => ({ fontSize: 12, color: active ? "#666" : "#BBB", marginTop: 2 }),
    btn: { width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#123524", color: "#FFF", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    err: { color: "#993556", fontSize: 13, marginBottom: 16, fontStyle: "italic", fontFamily: "'Libre Baskerville', serif" },
    email: { fontSize: 13, color: "#999", marginBottom: 24, fontFamily: "'Libre Baskerville', serif" },
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.title}>Mon profil</div>
        <div style={s.email}>{user.email}</div>
        {err && <div style={s.err}>{err}</div>}
        <span style={s.label}>Pseudo</span>
        <input style={s.input} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="ex: Marianne, JeanPaul…" onKeyDown={e => e.key === "Enter" && save()} />
        <span style={s.label}>Mon niveau de français</span>
        <div style={s.levelGrid}>
          {LEVELS.map(l => (
            <button key={l.value} style={s.levelBtn(level === l.value)} onClick={() => setLevel(l.value)}>
              <span style={s.levelLabel(level === l.value)}>{l.label}</span>
              <span style={s.levelDesc(level === l.value)}>{l.desc}</span>
            </button>
          ))}
        </div>
        <button style={s.btn} onClick={save} disabled={loading}>
          {loading ? "..." : "Enregistrer ↗"}
        </button>
      </div>
    </div>
  );
}