import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function ReviewMode({ userId, onClose }) {
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("vocabulary")
      .select("*")
      .eq("user_id", userId)
      .lte("next_review", today)
      .then(({ data }) => {
        setCards(data || []);
        setLoading(false);
      });
  }, [userId]);

  async function answer(knew) {
    const card = cards[index];
    const today = new Date();
    const newInterval = knew ? (card.interval || 1) * 2 : 1;
    const nextReview = new Date(today);
    nextReview.setDate(today.getDate() + newInterval);

    await supabase.from("vocabulary").update({
      interval: newInterval,
      next_review: nextReview.toISOString().split("T")[0],
    }).eq("id", card.id);

    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
    }
  }

  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", fontFamily: "'Inter', sans-serif" },
    wrap: { maxWidth: 560, margin: "0 auto", padding: "40px 20px" },
    card: { background: "#FFF", borderRadius: 20, border: "1px solid #EAE2D5", padding: 40, textAlign: "center", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: flipped ? "default" : "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.06)", transition: "0.2s" },
    word: { fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: "#123524", marginBottom: 8 },
    hint: { fontSize: 13, color: "#BBB", fontStyle: "italic", fontFamily: "'Libre Baskerville', serif" },
    definition: { fontFamily: "'Libre Baskerville', serif", fontSize: 16, lineHeight: 1.7, color: "#333", marginBottom: 16 },
    example: { fontSize: 14, color: "#888", fontStyle: "italic", borderLeft: "3px solid #EAE2D5", paddingLeft: 14, textAlign: "left" },
    btnRow: { display: "flex", gap: 12, marginTop: 28 },
    btnBad: { flex: 1, padding: "16px", borderRadius: 12, border: "2px solid #993556", background: "#FFF0F3", color: "#993556", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    btnGood: { flex: 1, padding: "16px", borderRadius: 12, border: "2px solid #3B6D11", background: "#F4F9ED", color: "#3B6D11", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    progress: { fontSize: 13, color: "#999", textAlign: "center", marginBottom: 20 },
  };

  if (loading) return (
    <div style={{ ...s.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: "italic", color: "#444" }}>✒️ Chargement...</div>
    </div>
  );

  if (done || cards.length === 0) return (
    <div style={{ ...s.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{cards.length === 0 ? "🎉" : "✅"}</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#123524", marginBottom: 8 }}>
          {cards.length === 0 ? "Rien à réviser aujourd'hui !" : "Révision terminée !"}
        </div>
        <div style={{ fontSize: 14, color: "#999", fontStyle: "italic", fontFamily: "'Libre Baskerville', serif", marginBottom: 28 }}>
          {cards.length === 0 ? "Reviens demain pour continuer." : `${cards.length} mot${cards.length > 1 ? "s" : ""} révisé${cards.length > 1 ? "s" : ""}.`}
        </div>
        <button onClick={onClose} style={{ background: "#123524", color: "#FFF", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          ← Retour
        </button>
      </div>
    </div>
  );

  const card = cards[index];

  return (
    <div style={s.container}>
      <div style={s.wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#999" }}>← Retour</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#123524" }}>{index + 1} / {cards.length}</span>
        </div>

        <div style={s.progress}>
          <div style={{ height: 4, background: "#EAE2D5", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((index) / cards.length) * 100}%`, background: "#123524", transition: "0.3s" }} />
          </div>
        </div>

        <div style={s.card} onClick={() => !flipped && setFlipped(true)}>
          {!flipped ? (
            <>
              <div style={s.word}>{card.word}</div>
              <div style={s.hint}>Clique pour voir la définition</div>
            </>
          ) : (
            <>
              <div style={{ ...s.word, fontSize: 24, marginBottom: 20 }}>{card.word}</div>
              <div style={s.definition}>{card.definition}</div>
              <div style={s.example}>{card.example}</div>
            </>
          )}
        </div>

        {flipped && (
          <div style={s.btnRow}>
            <button style={s.btnBad} onClick={() => answer(false)}>😅 À revoir</button>
            <button style={s.btnGood} onClick={() => answer(true)}>✓ Je sais</button>
          </div>
        )}

        {!flipped && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#CCC", fontStyle: "italic" }}>
            {card.interval > 1 ? `Intervalle actuel : ${card.interval} jours` : "Première révision"}
          </div>
        )}
      </div>
    </div>
  );
}