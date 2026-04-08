import { useState } from "react";
import { ALL_CHIPS } from "./chips";

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function OuiCan() {
  const [mode, setMode] = useState("keyword");
  const [exerciseType, setExerciseType] = useState("qcm");
  const [kw, setKw] = useState("");
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [phase, setPhase] = useState("input");
  const [chips, setChips] = useState(() => shuffle(ALL_CHIPS).slice(0, 5));
  const [ex, setEx] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [err, setErr] = useState("");
  const [vfAnswer, setVfAnswer] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionKw, setSessionKw] = useState("");
  const [sessionSourceUrl, setSessionSourceUrl] = useState("");

async function generate() {
  const isUrl = mode === "url";
  const value = isUrl ? url.trim() : kw.trim();
  if (!value) return;
  setSessionKw(isUrl ? "" : value);
  setSessionSourceUrl(isUrl ? value : "");
  setPhase("loading"); setErr("");
  const randomType = Math.random() > 0.5 ? "qcm" : "vraifaux";
  setExerciseType(randomType);
  const endpoint = randomType === "qcm"
    ? (isUrl ? "/generate-from-url" : "/generate-exercise")
    : (isUrl ? "/generate-vrai-faux-url" : "/generate-vrai-faux");
  const body = isUrl ? { url: value } : { keyword: value };
  try {
    const res = await fetch(`https://ouican.onrender.com${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data?.detail || "Erreur de connexion");
    setEx(data);
    setSourceUrl(isUrl ? value : "");
    setVfAnswer(null);
    setChosen(null);
    setPhase("question");
  } catch (e) {
    setErr(e.message); setPhase("error");
  }
}

  function pick(letter) {
    setChosen(letter);
    setScore(s => ({ correct: s.correct + (letter === ex.answer ? 1 : 0), total: s.total + 1 }));
    setPhase("result");
  }

  function pickVF(answer) {
    setVfAnswer(answer);
    setScore(s => ({ correct: s.correct + (answer === ex.answer ? 1 : 0), total: s.total + 1 }));
    setPhase("result");
  }

  function resetAll() {
    setKw(""); setUrl(""); setSourceUrl(""); setEx(null);
    setChosen(null); setVfAnswer(null); setPhase("input");
    setScore({ correct: 0, total: 0 });
    setSessionKw(""); setSessionSourceUrl("");
  }

  async function nextQuestion() {
    setEx(null); setChosen(null); setVfAnswer(null);
    setPhase("loading");
    const randomType = Math.random() > 0.5 ? "qcm" : "vraifaux";
    setExerciseType(randomType);
    const isUrl = !!sessionSourceUrl;
    const value = isUrl ? sessionSourceUrl : sessionKw;
    const endpoint = randomType === "qcm"
      ? (isUrl ? "/generate-from-url" : "/generate-exercise")
      : (isUrl ? "/generate-vrai-faux-url" : "/generate-vrai-faux");
    try {
      const res = await fetch(`https://ouican.onrender.com${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isUrl ? { url: value } : { keyword: value })
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data?.detail || "Erreur");
      setEx(data);
      setPhase("question");
    } catch(e) {
      setErr(e.message); setPhase("error");
    }
  }

  const displayTitle = sourceUrl
    ? new URL(sourceUrl).hostname.replace("www.", "")
    : (kw ? kw.toUpperCase() : "ÉDITION SPÉCIALE");

  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", color: "#1A1A1A", fontFamily: "'Inter', sans-serif" },
    wrap: { maxWidth: 640, margin: "0 auto", padding: "40px 20px" },
    card: { background: "#FFFFFF", padding: "28px", borderRadius: "16px", boxShadow: "0 12px 40px rgba(0,0,0,0.04)", border: "1px solid #EAE2D5" },
    tabGroup: { display: "flex", background: "#F0EDE7", padding: 4, borderRadius: 12, marginBottom: 16 },
    tab: (active) => ({ flex: 1, padding: "12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "#FFFFFF" : "transparent", color: active ? "#123524" : "#666", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "0.2s" }),
    input: { width: "100%", padding: "16px", fontSize: 16, borderRadius: 12, border: "2px solid #EEE", marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "'Libre Baskerville', serif" },
    mainBtn: { width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: "pointer", background: "#123524", color: "#FFF", fontSize: 16, fontWeight: 700, transition: "0.1s" },
    kicker: { fontSize: 11, fontWeight: 700, color: "#993556", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 },
    headline: { fontFamily: "'Playfair Display', serif", fontSize: 34, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.5px" },
    passage: { fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.8, color: "#2D2D2D", marginBottom: 30, textAlign: "justify", padding: "0 16px", borderLeft: "3px solid #123524" },
    option: (isCorrect, isWrong, isDimmed) => ({ width: "100%", display: "flex", alignItems: "center", gap: 15, padding: "18px", marginBottom: 12, borderRadius: "12px", border: "2px solid", cursor: "pointer", textAlign: "left", transition: "0.2s", borderColor: isCorrect ? "#3B6D11" : isWrong ? "#993556" : "#EEE", background: isCorrect ? "#F4F9ED" : isWrong ? "#FFF0F3" : "#FFF", opacity: isDimmed ? 0.4 : 1 }),
    vfBtn: (selected, isResult, isCorrect) => {
      let borderColor = "#EEE";
      let bg = "#FFF";
      if (isResult && isCorrect) { borderColor = "#3B6D11"; bg = "#F4F9ED"; }
      else if (isResult && selected && !isCorrect) { borderColor = "#993556"; bg = "#FFF0F3"; }
      else if (!isResult && selected) { borderColor = "#123524"; bg = "#F0EDE7"; }
      return { flex: 1, padding: "20px", borderRadius: 12, border: `2px solid ${borderColor}`, background: bg, cursor: isResult ? "default" : "pointer", fontSize: 17, fontWeight: 800, color: isResult && isCorrect ? "#3B6D11" : isResult && selected ? "#993556" : selected ? "#123524" : "#999", transition: "0.15s" };
    },
    feedback: { marginTop: 20, padding: "24px", borderRadius: "12px", backgroundColor: "#F8F8F8", borderLeft: "4px solid #123524", fontFamily: "'Libre Baskerville', serif", lineHeight: 1.7, color: "#444" },
  };

  return (
    <div style={s.container}>
      <div style={s.wrap}>

        <header style={{ textAlign: "center", borderTop: "3px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "24px 0 16px", marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'UnifrakturMaguntia', serif", fontWeight: 400, fontSize: 88, lineHeight: 0.9, color: "#123524", margin: 0, letterSpacing: -2, textShadow: "1px 1px 0px rgba(0,0,0,0.1), 3px 3px 0.5px rgba(18,53,36,0.15), 0 0 10px rgba(18,53,36,0.05)" }}>
            OuiCan
          </h1>
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 12, textTransform: "uppercase", letterSpacing: 6, fontWeight: 400, color: "#666", marginTop: 12, display: "block", fontStyle: "italic" }}>
            Le Français par la curiosité
          </span>
        </header>

        {phase === "input" && (
          <div style={s.card}>
            <div style={s.tabGroup}>
              <button style={s.tab(mode === "keyword")} onClick={() => setMode("keyword")}>Mot-clé</button>
              <button style={s.tab(mode === "url")} onClick={() => setMode("url")}>URL Article</button>
            </div>
            <input
              style={s.input}
              value={mode === "keyword" ? kw : url}
              onChange={e => mode === "keyword" ? setKw(e.target.value) : setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder={mode === "keyword" ? "ex: Les JO de Paris, Simone Veil…" : "Coller l'URL d'un article…"}
            />
            {mode === "url" && (
              <div style={{ fontSize: 12, color: "#999", fontStyle: "italic", marginBottom: 12 }}>
                Fonctionne avec RFI, France Info, Wikipedia…
              </div>
            )}
            <button style={s.mainBtn} onClick={generate}>Rédiger mon sujet ↗</button>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                {chips.map(c => (
                  <span key={c} onClick={() => setKw(c)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#F0EDE7", cursor: "pointer", color: "#666" }}>
                    {c}
                  </span>
                ))}
              </div>
              <button onClick={() => setChips(shuffle(ALL_CHIPS).slice(0, 5))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#999" }}>
                Autres idées 🔀
              </button>
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 20, display: "inline-block", animation: "writing 1s ease-in-out infinite alternate", transformOrigin: "bottom center" }}>✒️</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "#444" }}>
              Notre rédacteur affûte sa plume...
            </div>
          </div>
        )}

        {phase === "error" && (
          <div style={{ ...s.card, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🥐</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 8, color: "#1A1A1A" }}>
              {err.includes("payant") || err.includes("inaccessible")
                ? "Ce site n'est pas accessible…"
                : err.includes("connexion") || err.includes("fetch")
                ? "Pas de connexion, mon ami."
                : "Notre rédacteur a eu un moment de doute."}
            </p>
            <p style={{ fontSize: 13, color: "#999", fontStyle: "italic", marginBottom: 20, fontFamily: "'Libre Baskerville', serif" }}>
              {err.includes("payant") || err.includes("inaccessible")
                ? "Essaie avec RFI, France Info ou Wikipedia — c'est gratuit et bien écrit."
                : err.includes("connexion") || err.includes("fetch")
                ? "Vérifie ta connexion et réessaie."
                : "Il a retenté, en vain. Parfois l'inspiration ne vient pas."}
            </p>
            <button style={s.mainBtn} onClick={resetAll}>← Recommencer</button>
          </div>
        )}

        {(phase === "question" || phase === "result") && ex && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={resetAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#999", padding: 0 }}>
                ← Accueil
              </button>
              {score.total > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "#123524" }}>
                  {score.correct}/{score.total} ✓
                </span>
              )}
            </div>
            <div style={s.kicker}>
              {exerciseType === "vraifaux" ? "Vrai / Faux · B2" : "Compréhension écrite · B2"}
            </div>
            <h1 style={s.headline}>
              {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", borderBottom: "2px solid #EAE2D5" }}>
                  {displayTitle} ↗
                </a>
              ) : displayTitle}
            </h1>
            <div style={{ borderTop: "2.5px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "6px 0", marginBottom: 25, fontSize: 11, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#333" }}>
              <span>OUICAN · {new Date().toLocaleDateString('fr-FR')}</span>
              <span>B2 PREMIUM</span>
            </div>

            <div style={s.passage}>{ex.passage}</div>

            {/* ── QCM ── */}
            {exerciseType === "qcm" && (
              <>
                <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ background: "#123524", color: "#FFF", padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 4, letterSpacing: 1, whiteSpace: "nowrap" }}>QUESTION</span>
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
                    <button style={{ ...s.mainBtn, marginTop: 24 }} onClick={nextQuestion}> Prochain sujet </button>
                  </div>
                )}
              </>
            )}

            {/* ── Vrai / Faux ── */}
            {exerciseType === "vraifaux" && (
              <>
                <div style={{ marginBottom: 24, padding: "20px", background: "#FFF", borderRadius: 12, border: "2px solid #EAE2D5" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#993556", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Affirmation</div>
                  <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{ex.statement}</div>
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <button
                    disabled={phase === "result"}
                    onClick={() => pickVF("vrai")}
                    style={s.vfBtn(vfAnswer === "vrai", phase === "result", phase === "result" && ex.answer === "vrai")}
                  >
                    ✓ Vrai
                  </button>
                  <button
                    disabled={phase === "result"}
                    onClick={() => pickVF("faux")}
                    style={s.vfBtn(vfAnswer === "faux", phase === "result", phase === "result" && ex.answer === "faux")}
                  >
                    ✗ Faux
                  </button>
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
                    <button style={{ ...s.mainBtn, marginTop: 24 }} onClick={nextQuestion}> Prochain sujet </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
