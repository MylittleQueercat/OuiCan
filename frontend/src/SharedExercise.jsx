import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function SharedExercise({ id }) {
  const [ex, setEx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(null);
  const [vfAnswer, setVfAnswer] = useState(null);
  const [phase, setPhase] = useState("question");

  useEffect(() => {
    supabase.from("shared_exercises").select("*").eq("id", id).single()
      .then(({ data, error }) => {
        if (error || !data) setEx(null);
        else setEx(data);
        setLoading(false);
      });
  }, [id]);

  function pick(letter) { setChosen(letter); setPhase("result"); }
  function pickVF(answer) { setVfAnswer(answer); setPhase("result"); }

  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", color: "#1A1A1A", fontFamily: "'Inter', sans-serif" },
    wrap: { maxWidth: 640, margin: "0 auto", padding: "40px 20px" },
    passage: { fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.8, color: "#2D2D2D", marginBottom: 30, textAlign: "justify", padding: "0 16px", borderLeft: "3px solid #123524" },
    option: (isCorrect, isWrong, isDimmed) => ({ width: "100%", display: "flex", alignItems: "center", gap: 15, padding: "18px", marginBottom: 12, borderRadius: "12px", border: "2px solid", cursor: "pointer", textAlign: "left", borderColor: isCorrect ? "#3B6D11" : isWrong ? "#993556" : "#EEE", background: isCorrect ? "#F4F9ED" : isWrong ? "#FFF0F3" : "#FFF", opacity: isDimmed ? 0.4 : 1 }),
    vfBtn: (selected, isResult, isCorrect) => {
      let borderColor = "#EEE", bg = "#FFF";
      if (isResult && isCorrect) { borderColor = "#3B6D11"; bg = "#F4F9ED"; }
      else if (isResult && selected && !isCorrect) { borderColor = "#993556"; bg = "#FFF0F3"; }
      else if (!isResult && selected) { borderColor = "#123524"; bg = "#F0EDE7"; }
      return { flex: 1, padding: "20px", borderRadius: 12, border: `2px solid ${borderColor}`, background: bg, cursor: isResult ? "default" : "pointer", fontSize: 17, fontWeight: 800, color: isResult && isCorrect ? "#3B6D11" : isResult && selected ? "#993556" : selected ? "#123524" : "#999" };
    },
    feedback: { marginTop: 20, padding: "24px", borderRadius: "12px", backgroundColor: "#F8F8F8", borderLeft: "4px solid #123524", fontFamily: "'Libre Baskerville', serif", lineHeight: 1.7, color: "#444" },
    mainBtn: { width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: "pointer", background: "#123524", color: "#FFF", fontSize: 16, fontWeight: 700, marginTop: 24 },
  };

  if (loading) return (
    <div style={{ ...s.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "#444" }}>
        ✒️ Chargement...
      </div>
    </div>
  );

  if (!ex) return (
    <div style={{ ...s.container, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🥐</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}>Question introuvable.</div>
        <a href="https://ouican.pages.dev" style={{ color: "#123524", fontSize: 14, marginTop: 12, display: "block" }}>← Retour à OuiCan</a>
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.wrap}>
        <header style={{ textAlign: "center", borderTop: "3px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "24px 0 16px", marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'UnifrakturMaguntia', serif", fontWeight: 400, fontSize: 88, lineHeight: 0.9, color: "#123524", margin: 0, letterSpacing: -2 }}>
            OuiCan
          </h1>
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 12, textTransform: "uppercase", letterSpacing: 6, color: "#666", marginTop: 12, display: "block", fontStyle: "italic" }}>
            Question partagée · {ex.level || "B2"}
          </span>
        </header>

        <div style={s.passage}>{ex.passage}</div>

        {ex.exercise_type === "qcm" && (
          <>
            <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ background: "#123524", color: "#FFF", padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 4, letterSpacing: 1 }}>QUESTION</span>
              <span style={{ fontWeight: 700, fontSize: 18, flex: 1, lineHeight: 1.4 }}>{ex.question}</span>
            </div>
            {Object.entries(ex.options).map(([letter, text]) => {
              const isCorrect = phase === "result" && letter === ex.answer;
              const isWrong = phase === "result" && chosen === letter && letter !== ex.answer;
              const isDimmed = phase === "result" && letter !== ex.answer && chosen !== letter;
              return (
                <button key={letter} disabled={phase === "result"} onClick={() => pick(letter)} style={s.option(isCorrect, isWrong, isDimmed)}>
                  <span style={{ fontWeight: 800, width: 28, fontSize: 18, color: "#123524", flexShrink: 0 }}>{letter}.</span>
                  <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16 }}>{text}</span>
                </button>
              );
            })}
            {phase === "result" && (
              <div style={s.feedback}>
                <div style={{ fontWeight: 700, color: chosen === ex.answer ? "#3B6D11" : "#993556", marginBottom: 10, fontSize: 15, letterSpacing: 1 }}>
                  {chosen === ex.answer ? "✓ EXCELLENT !" : "✗ ANALYSE À REVOIR..."}
                </div>
                <div style={{ fontStyle: "italic" }}>{ex.explanation}</div>
              </div>
            )}
          </>
        )}

        {ex.exercise_type === "vraifaux" && (
          <>
            <div style={{ marginBottom: 24, padding: "20px", background: "#FFF", borderRadius: 12, border: "2px solid #EAE2D5" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#993556", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Affirmation</div>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{ex.statement}</div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button disabled={phase === "result"} onClick={() => pickVF("vrai")} style={s.vfBtn(vfAnswer === "vrai", phase === "result", phase === "result" && ex.answer === "vrai")}>✓ Vrai</button>
              <button disabled={phase === "result"} onClick={() => pickVF("faux")} style={s.vfBtn(vfAnswer === "faux", phase === "result", phase === "result" && ex.answer === "faux")}>✗ Faux</button>
            </div>
            {phase === "result" && (
              <div style={s.feedback}>
                <div style={{ fontWeight: 700, color: vfAnswer === ex.answer ? "#3B6D11" : "#993556", marginBottom: 10, fontSize: 15, letterSpacing: 1 }}>
                  {vfAnswer === ex.answer ? "✓ EXCELLENT !" : `✗ C'était ${ex.answer.toUpperCase()}`}
                </div>
                <div style={{ fontStyle: "italic", marginBottom: 12 }}>{ex.explanation}</div>
                <div style={{ fontSize: 13, color: "#888", borderTop: "1px solid #EEE", paddingTop: 12 }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>Idée clé : </span>{ex.justification}
                </div>
              </div>
            )}
          </>
        )}

        <a href="https://ouican.pages.dev" style={{ display: "block", textAlign: "center", marginTop: 32, fontSize: 13, color: "#999", fontFamily: "'Libre Baskerville', serif", fontStyle: "italic" }}>
          Envie de t'entraîner ? → OuiCan
        </a>
      </div>
    </div>
  );
}