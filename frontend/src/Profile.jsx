import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import ReviewMode from "./ReviewMode";

const LEVELS = [
  { value: "A1", label: "A1", desc: "Découverte" },
  { value: "A2", label: "A2", desc: "Élémentaire" },
  { value: "B1", label: "B1", desc: "Intermédiaire" },
  { value: "B2", label: "B2", desc: "Avancé" },
  { value: "C1", label: "C1", desc: "Autonome" },
  { value: "C2", label: "C2", desc: "Maîtrise" },
];

export default function Profile({ user, onSave, onDeleteWord }) {
  const [nickname, setNickname] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [vocab, setVocab] = useState([]);
  const [vocabLoading, setVocabLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("nickname, level").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) { setNickname(data.nickname || ""); setLevel(data.level || ""); }
      });
    supabase.from("vocabulary").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setVocab(data || []); setVocabLoading(false); });
  }, [user]);

  async function save() {
    if (!nickname.trim()) { setErr("Choisis un pseudo !"); return; }
    if (!level) { setErr("Choisis ton niveau !"); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email, nickname: nickname.trim(), level });
    if (error) { setErr(error.message); setLoading(false); return; }
    onSave({ nickname: nickname.trim(), level });
  }

  async function deleteWord(id, word) {
    await supabase.from("vocabulary").delete().eq("id", id);
    setVocab(v => v.filter(w => w.id !== id));
    if (onDeleteWord) onDeleteWord(word);
  }

  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", fontFamily: "'Inter', sans-serif" },
    wrap: { maxWidth: 560, margin: "0 auto", padding: "40px 20px" },
    title: { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 6 },
    email: { fontSize: 13, color: "#999", marginBottom: 24, fontFamily: "'Libre Baskerville', serif" },
    tabGroup: { display: "flex", background: "#F0EDE7", padding: 4, borderRadius: 12, marginBottom: 28 },
    tab: (active) => ({ flex: 1, padding: "10px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "#FFF" : "transparent", color: active ? "#123524" : "#666", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "0.2s" }),
    card: { background: "#FFF", padding: 32, borderRadius: 16, border: "1px solid #EAE2D5" },
    label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#666", marginBottom: 8, display: "block" },
    input: { width: "100%", padding: "14px", fontSize: 15, borderRadius: 10, border: "2px solid #EEE", marginBottom: 20, boxSizing: "border-box", outline: "none", fontFamily: "'Libre Baskerville', serif" },
    levelGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 },
    levelBtn: (active) => ({ padding: "16px", borderRadius: 10, border: `2px solid ${active ? "#123524" : "#EEE"}`, background: active ? "#F0EDE7" : "#FFF", cursor: "pointer", textAlign: "center", transition: "0.15s" }),
    levelLabel: (active) => ({ fontSize: 20, fontWeight: 800, color: active ? "#123524" : "#999", display: "block" }),
    levelDesc: (active) => ({ fontSize: 12, color: active ? "#666" : "#BBB", marginTop: 2 }),
    btn: { width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#123524", color: "#FFF", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    err: { color: "#993556", fontSize: 13, marginBottom: 16, fontStyle: "italic", fontFamily: "'Libre Baskerville', serif" },
    wordCard: { padding: "16px", borderRadius: 12, border: "1px solid #EAE2D5", marginBottom: 12, background: "#FFF" },
  };

  if (reviewing) return <ReviewMode userId={user.id} onClose={() => setReviewing(false)} />;

  return (
    <div style={s.container}>
      <div style={s.wrap}>
        <div style={s.title}>Mon profil</div>
        <div style={s.email}>{user.email}</div>

        <div style={s.tabGroup}>
          <button style={s.tab(tab === "profile")} onClick={() => setTab("profile")}>⚙️ Paramètres</button>
          <button style={s.tab(tab === "vocab")} onClick={() => setTab("vocab")}>📖 Vocabulaire {vocab.length > 0 && `(${vocab.length})`}</button>
        </div>

        {tab === "profile" && (
          <div style={s.card}>
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
        )}

        {tab === "vocab" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: "#999" }}>{vocab.length} mot{vocab.length > 1 ? "s" : ""} sauvegardé{vocab.length > 1 ? "s" : ""}</span>
              {vocab.length > 0 && (
                <button
                  onClick={() => setReviewing(true)}
                  style={{ background: "#123524", color: "#FFF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  🔁 Réviser
                </button>
              )}
            </div>
            {vocabLoading ? (
              <div style={{ textAlign: "center", color: "#999", fontStyle: "italic", padding: 40 }}>Chargement...</div>
            ) : vocab.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#444" }}>Pas encore de mots sauvegardés.</div>
                <div style={{ fontSize: 13, color: "#999", marginTop: 8, fontStyle: "italic", fontFamily: "'Libre Baskerville', serif" }}>
                  Clique sur un mot dans un passage pour l'apprendre.
                </div>
              </div>
            ) : (
              (() => {
                const grouped = vocab.reduce((acc, w) => {
                  const key = w.topic || "Divers";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(w);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([topic, words]) => (
                  <div key={topic} style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#993556", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{topic}</span>
                      <span style={{ color: "#CCC", fontWeight: 400 }}>({words.length})</span>
                    </div>
                    {words.map(w => (
                      <div key={w.id} style={s.wordCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#123524" }}>{w.word}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#999", background: "#F0EDE7", padding: "2px 8px", borderRadius: 4 }}>{w.level}</span>
                            <button onClick={() => deleteWord(w.id, w.word)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#CCC" }}>✕</button>
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 14, color: "#444", marginTop: 8, lineHeight: 1.6 }}>{w.definition}</div>
                        <div style={{ fontSize: 13, color: "#888", fontStyle: "italic", marginTop: 6, borderLeft: "2px solid #EAE2D5", paddingLeft: 10 }}>{w.example}</div>
                      </div>
                    ))}
                  </div>
                ));
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}