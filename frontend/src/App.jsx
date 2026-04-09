import { ALL_CHIPS } from "./chips";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { INJECTED_CSS } from "./AppStyles";

// --- CUSTOM COMPONENTS ---
import Auth from "./Auth";
import Profile from "./Profile";
import SharedExercise from "./SharedExercise";

// --- SERVICES (EXTRACTED LOGIC) ---
import { fetchExerciseApi, fetchWordExplanation, createShareLink } from "./services/api";
import { loadProfileDb, updateStreakDb, saveVocabularyDb } from "./services/database";

// --- UTILS ---
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function OuiCan() {
  // 1. STATE: UI FLOW & MODES
  const [phase, setPhase] = useState("input"); // input, loading, question, result, error
  const [mode, setMode] = useState("keyword"); // keyword, url
  const [exerciseType, setExerciseType] = useState("qcm"); // qcm, vraifaux
  const [chips, setChips] = useState(() => shuffle(ALL_CHIPS).slice(0, 5));
  const [err, setErr] = useState("");

  // 2. STATE: USER & AUTH DATA
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // 3. STATE: EXERCISE & SESSION DATA
  const [ex, setEx] = useState(null);
  const [kw, setKw] = useState("");
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [chosen, setChosen] = useState(null);
  const [vfAnswer, setVfAnswer] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionKw, setSessionKw] = useState("");
  const [sessionSourceUrl, setSessionSourceUrl] = useState("");

  // 4. STATE: VOCABULARY & SHARING
  const [wordCard, setWordCard] = useState(null);
  const [savedWords, setSavedWords] = useState([]);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);

  // 5. INITIALIZATION & AUTH LISTENERS
  const [sharedId] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/\/share\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  });

  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setUser(session?.user ?? null);
  //     if (session?.user) handleProfileLoad(session.user.id);
  //     else setAuthLoading(false);
  //   });

  //   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  //     setUser(session?.user ?? null);
  //     if (session?.user) handleProfileLoad(session.user.id);
  //     else setProfile(null);
  //   });
  //   return () => subscription.unsubscribe();
  // }, []);

useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) handleProfileLoad(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) handleProfileLoad(session.user.id);
      else setProfile(null);
    });

    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Libre+Baskerville:ital@0;1&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.innerHTML = INJECTED_CSS;
    document.head.appendChild(style);

    return () => {
      subscription.unsubscribe();
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  async function handleProfileLoad(userId) {
    const data = await loadProfileDb(userId);
    if (data?.nickname) setProfile(data);
    if (data?.streak) setStreak(data.streak);
    setAuthLoading(false);
  }

  // 6. LOGIC: EXERCISE ENGINE
  async function generate() {
    const isUrl = mode === "url";
    const value = isUrl ? url.trim() : kw.trim();
    if (!value) return;

    setSessionKw(isUrl ? "" : value);
    setSessionSourceUrl(isUrl ? value : "");
    setPhase("loading"); setErr("");

    try {
      const { data, type } = await fetchExerciseApi(isUrl, value, profile.level);
      setEx(data);
      setExerciseType(type);
      setSourceUrl(isUrl ? value : "");
      setVfAnswer(null); setChosen(null);
      setPhase("question");
    } catch (e) {
      setErr(e.message); setPhase("error");
    }
  }

  async function nextQuestion() {
    setEx(null); setChosen(null); setVfAnswer(null); setShareUrl(null);
    setPhase("loading");
    try {
      const isUrl = !!sessionSourceUrl;
      const value = isUrl ? sessionSourceUrl : sessionKw;
      const { data, type } = await fetchExerciseApi(isUrl, value, profile.level);
      setEx(data);
      setExerciseType(type);
      setPhase("question");
    } catch (e) {
      setErr(e.message); setPhase("error");
    }
  }

  // 7. LOGIC: USER INTERACTION
  async function handleAnswer(isCorrect, answerValue) {
    if (exerciseType === "qcm") setChosen(answerValue);
    else setVfAnswer(answerValue);

    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    setPhase("result");

    const newStreak = await updateStreakDb(user.id);
    setStreak(newStreak);
  }

  const resetAll = () => {
    setKw(""); setUrl(""); setSourceUrl(""); setEx(null);
    setChosen(null); setVfAnswer(null); setPhase("input");
    setScore({ correct: 0, total: 0 });
  };

  // 8. LOGIC: VOCABULARY & SHARING
  async function handleExplainWord(word) {
    setWordCard({ word, loading: true });
    try {
      const data = await fetchWordExplanation(word, profile.level);
      setWordCard({ word, ...data, loading: false });
    } catch (e) { setWordCard(null); }
  }

  async function handleSaveWord() {
    if (!wordCard || wordCard.loading) return;
    let topic = sessionKw || (sessionSourceUrl ? new URL(sessionSourceUrl).hostname : "Divers");
    await saveVocabularyDb(user.id, wordCard, profile.level, topic);
    setSavedWords(sw => [...sw, wordCard.word]);
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const payload = { exercise_type: exerciseType, ...ex, level: profile.level, topic: sessionKw || sessionSourceUrl };
      const data = await createShareLink(payload);
      const fullLink = `https://ouican.pages.dev/share/${data.id}`;
      setShareUrl(fullLink);
      navigator.clipboard.writeText(fullLink);
    } catch (e) { console.error(e); } finally { setShareLoading(false); }
  }

  // 9. STYLES
  const s = {
    container: { minHeight: "100vh", backgroundColor: "#F9F7F2", color: "#1A1A1A", fontFamily: "'Inter', sans-serif" },
    wrap: { maxWidth: 1026, margin: "0 auto", padding: "40px 20px" },
    card: { background: "#FFFFFF", padding: "28px", borderRadius: "16px", boxShadow: "0 12px 40px rgba(0,0,0,0.04)", border: "1px solid #EAE2D5" },
    tabGroup: { display: "flex", background: "#F0EDE7", padding: 4, borderRadius: 12, marginBottom: 16 },
    tab: (active) => ({ flex: 1, padding: "12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "#FFFFFF" : "transparent", color: active ? "#123524" : "#666", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "0.2s" }),
    input: { width: "100%", padding: "16px", fontSize: 16, borderRadius: 12, border: "2px solid #EEE", marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "'Libre Baskerville', serif" },
    mainBtn: { width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: "pointer", background: "#123524", color: "#FFF", fontSize: 16, fontWeight: 700 },
    kicker: { fontSize: 11, fontWeight: 700, color: "#993556", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 },
    headline: { fontFamily: "'Playfair Display', serif", fontSize: 34, lineHeight: 1.1, marginBottom: 20 },
    passage: { fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.8, color: "#2D2D2D", marginBottom: 30, textAlign: "justify", padding: "0 16px", borderLeft: "3px solid #123524" },
    option: (isCorrect, isWrong, isDimmed) => ({ width: "100%", display: "flex", alignItems: "center", gap: 15, padding: "18px", marginBottom: 12, borderRadius: "12px", border: "2px solid", cursor: "pointer", textAlign: "left", transition: "0.2s", borderColor: isCorrect ? "#3B6D11" : isWrong ? "#993556" : "#EEE", background: isCorrect ? "#F4F9ED" : isWrong ? "#FFF0F3" : "#FFF", opacity: isDimmed ? 0.4 : 1 }),
    vfBtn: (selected, isResult, isCorrect) => {
      let borderColor = "#EEE", bg = "#FFF";
      if (isResult && isCorrect) { borderColor = "#3B6D11"; bg = "#F4F9ED"; }
      else if (isResult && selected && !isCorrect) { borderColor = "#993556"; bg = "#FFF0F3"; }
      else if (!isResult && selected) { borderColor = "#123524"; bg = "#F0EDE7"; }
      return { flex: 1, padding: "20px", borderRadius: 12, border: `2px solid ${borderColor}`, background: bg, cursor: isResult ? "default" : "pointer", fontSize: 17, fontWeight: 800, color: isResult && isCorrect ? "#3B6D11" : isResult && selected ? "#993556" : selected ? "#123524" : "#999" };
    },
    feedback: { marginTop: 20, padding: "24px", borderRadius: "12px", backgroundColor: "#F8F8F8", borderLeft: "4px solid #123524", fontFamily: "'Libre Baskerville', serif", lineHeight: 1.7, color: "#444" },
  };

  const displayTitle = sessionSourceUrl
    ? (() => {
        try {
          return new URL(sessionSourceUrl).hostname.replace("www.", "");
        } catch (e) {
          return sessionSourceUrl;
        }
      })()
    : (sessionKw ? sessionKw.toUpperCase() : "ÉDITION SPÉCIALE");

  // 10. MAIN RENDER (JSX)
  if (authLoading) return null;
  if (sharedId) return <SharedExercise id={sharedId} />;
  if (!user) return <Auth />;
  if (!profile) return <Profile user={user} onSave={(p) => setProfile(p)} onDeleteWord={(word) => setSavedWords(sw => sw.filter(w => w !== word))} />;

  return (
    <div style={s.container}>
      <div style={s.wrap}>
        
        {/* Header Section */}
        {/* <header style={{ textAlign: "center", borderTop: "3px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "24px 0 16px", marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'UnifrakturMaguntia', serif", fontWeight: 400, fontSize: 88, lineHeight: 0.9, color: "#123524", margin: 0, letterSpacing: -2, textShadow: "1px 1px 0px rgba(0,0,0,0.1), 3px 3px 0.5px rgba(18,53,36,0.15), 0 0 10px rgba(18,53,36,0.05)" }}>
            OuiCan
          </h1>
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 12, textTransform: "uppercase", letterSpacing: 6, fontWeight: 400, color: "#666", marginTop: 12, display: "block", fontStyle: "italic" }}>
            Le Français par la curiosité
          </span>
        </header> */}

        {/* ==============================
            Header Section (Refactored)
            ============================== */}
        <header className="ouican-header">
          {/* Left Spacer: Balancing the layout for visual centering */}
          <div style={{ width: 140 }}></div>

          {/* Center Brand: Heading & Tagline */}
          <div className="header-center">
            <h1 style={{ 
              fontFamily: "'UnifrakturMaguntia', serif", 
              fontSize: 88, 
              margin: 0, 
              lineHeight: 0.9,
              color: "#123524",
              textShadow: "1px 1px 0px rgba(0,0,0,0.1), 3px 3px 0.5px rgba(18,53,36,0.15)"
            }}>
              OuiCan
            </h1>
            <span style={{ 
              fontFamily: "'Inter', sans-serif", 
              fontSize: 10, 
              letterSpacing: 6, 
              textTransform: "uppercase",
              color: "#666",
              display: "block",
              marginTop: 8
            }}>
              Le Français par la curiosité
            </span>
          </div>

          {/* Right Info Box (The Ear): Date & Streak */}
          <div className="header-ear-right">
            <div className="ear-text-box">
              {/* 动态显示法语星期、日期和年份 */}
              {new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date())}<br />
              {new Intl.DateTimeFormat('fr-FR', { month: 'long', day: 'numeric' }).format(new Date())}<br />
              {new Date().getFullYear()}
            </div>
            <div className="ear-streak-value">
              {streak}
            </div>
          </div>
        </header>

        {/* User Info Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: "#666", fontFamily: "'Libre Baskerville', serif" }}>
            Bonjour, <strong>{profile.nickname}</strong> · {profile.level}
            {streak > 0 && <span style={{ marginLeft: 10, color: "#E8630A", fontWeight: 700 }}>🔥 {streak}</span>}
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setProfile(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#999" }}>⚙️ Profil</button>
            <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#999" }}>Déconnexion</button>
          </div>
        </div>

        {/* Input Phase */}
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
            <button style={s.mainBtn} onClick={generate}>Rédiger mon sujet ↗</button>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                {chips.map(c => <span key={c} onClick={() => setKw(c)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#F0EDE7", cursor: "pointer", color: "#666" }}>{c}</span>)}
              </div>
              <button onClick={() => setChips(shuffle(ALL_CHIPS).slice(0, 5))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#999" }}>Autres idées 🔀</button>
            </div>
          </div>
        )}

        {/* Loading Phase */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "100px 0" }} className="ouican-fade-in">
            <div className="animate-pen" style={{ fontSize: 40, marginBottom: 20 }}>✒️</div>
            <div style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: 22, 
              fontStyle: "italic", 
              color: "#444" 
            }}>
              Rédaction par le chat... Miaou ?
            </div>
          </div>
        )}

        {/* Error Phase */}
        {phase === "error" && (
          <div style={{ ...s.card, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🥐</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 20 }}>{err.includes("payant") ? "Site inaccessible..." : "Une petite erreur..."}</p>
            <button style={s.mainBtn} onClick={resetAll}>← Recommencer</button>
          </div>
        )}

        {/* Question & Result Phases */}
        {(phase === "question" || phase === "result") && ex && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={resetAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#999" }}>← Accueil</button>
              {score.total > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#123524" }}>{score.correct}/{score.total} ✓</span>}
            </div>
            
            <div style={s.kicker}>{exerciseType === "vraifaux" ? "Vrai / Faux" : "Compréhension écrite"}</div>
            <h1 style={s.headline}>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{displayTitle} ↗</a> : displayTitle}</h1>
            
            <div style={{ borderTop: "2.5px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "6px 0", marginBottom: 25, fontSize: 11, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>OUICAN · {new Date().toLocaleDateString('fr-FR')}</span>
              <span>{profile?.level} PREMIUM</span>
            </div>

            <div style={s.passage}>
              {ex.passage.split(/(\s+)/).map((token, i) => {
                const clean = token.replace(/[.,!?;:«»""]/g, "").trim();
                if (!clean) return <span key={i}>{token}</span>;
                return (
                  <span key={i} onClick={() => handleExplainWord(clean)} style={{ cursor: "pointer", borderBottom: "1px dotted #999" }}>{token}</span>
                );
              })}
            </div>

            {/* QCM Layout */}
            {exerciseType === "qcm" && (
              <>
                <div style={{ marginBottom: 24, display: "flex", gap: 12 }}>
                  <span style={{ background: "#123524", color: "#FFF", padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 4 }}>QUESTION</span>
                  <span style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>{ex.question}</span>
                </div>
                {Object.entries(ex.options).map(([letter, text]) => (
                  <button key={letter} disabled={phase === "result"} onClick={() => handleAnswer(letter === ex.answer, letter)} style={s.option(phase === "result" && letter === ex.answer, phase === "result" && chosen === letter && letter !== ex.answer, phase === "result" && letter !== ex.answer && chosen !== letter)}>
                    <span style={{ fontWeight: 800, width: 28, fontSize: 18 }}>{letter}.</span>
                    <span style={{ fontFamily: "'Libre Baskerville', serif" }}>{text}</span>
                  </button>
                ))}
              </>
            )}

            {/* Vrai/Faux Layout */}
            {exerciseType === "vraifaux" && (
              <>
                <div style={{ marginBottom: 24, padding: "20px", background: "#FFF", borderRadius: 12, border: "2px solid #EAE2D5" }}>
                  <div style={s.kicker}>Affirmation</div>
                  <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17 }}>{ex.statement}</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button disabled={phase === "result"} onClick={() => handleAnswer("vrai" === ex.answer, "vrai")} style={s.vfBtn(vfAnswer === "vrai", phase === "result", phase === "result" && ex.answer === "vrai")}>✓ Vrai</button>
                  <button disabled={phase === "result"} onClick={() => handleAnswer("faux" === ex.answer, "faux")} style={s.vfBtn(vfAnswer === "faux", phase === "result", phase === "result" && ex.answer === "faux")}>✗ Faux</button>
                </div>
              </>
            )}

            {phase === "result" && (
              <div style={s.feedback}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{chosen === ex.answer || vfAnswer === ex.answer ? "✓ EXCELLENT !" : "✗ À REVOIR"}</div>
                <div style={{ fontStyle: "italic", marginBottom: 16 }}>{ex.explanation}</div>
                {exerciseType === "vraifaux" && <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}><span style={{ fontWeight: 700 }}>Preuve : </span>{ex.justification}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={s.mainBtn} onClick={nextQuestion}>Prochain sujet</button>
                  <button onClick={handleShare} disabled={shareLoading} style={{ background: "none", border: "1px solid #123524", color: "#123524", padding: "10px 16px", borderRadius: 12, fontSize: 14, cursor: "pointer" }}>
                    {shareUrl ? "Lien copié ✓" : "🔗 Partager"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Word Card Dialog */}
        {wordCard && (
          <div onClick={() => setWordCard(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#FFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 600 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#123524" }}>{wordCard.word}</span>
                <button onClick={() => setWordCard(null)} style={{ background: "none", border: "none", fontSize: 20 }}>✕</button>
              </div>
              {wordCard.loading ? "Déchiffrement..." : (
                <>
                  <div style={{ marginBottom: 12 }}>{wordCard.definition}</div>
                  <div style={{ fontStyle: "italic", color: "#666", marginBottom: 20 }}>{wordCard.example}</div>
                </>
              )}
              <button 
                onClick={handleSaveWord} 
                disabled={savedWords.includes(wordCard.word) || wordCard.loading}
                style={{ ...s.mainBtn, width: "auto", padding: "10px 20px" }}
              >
                {savedWords.includes(wordCard.word) ? "Sauvegardé ✓" : "💾 Sauvegarder"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


// import { ALL_CHIPS } from "./chips";
// import { useState, useEffect } from "react";
// import { supabase } from "./supabase";
// import Auth from "./Auth";
// import Profile from "./Profile";
// import SharedExercise from "./SharedExercise";

// function shuffle(arr) {
//   return [...arr].sort(() => Math.random() - 0.5);
// }

// export default function OuiCan() {
//   const [mode, setMode] = useState("keyword");
//   const [exerciseType, setExerciseType] = useState("qcm");
//   const [kw, setKw] = useState("");
//   const [url, setUrl] = useState("");
//   const [sourceUrl, setSourceUrl] = useState("");
//   const [phase, setPhase] = useState("input");
//   const [chips, setChips] = useState(() => shuffle(ALL_CHIPS).slice(0, 5));
//   const [ex, setEx] = useState(null);
//   const [chosen, setChosen] = useState(null);
//   const [err, setErr] = useState("");
//   const [vfAnswer, setVfAnswer] = useState(null);
//   const [score, setScore] = useState({ correct: 0, total: 0 });
//   const [sessionKw, setSessionKw] = useState("");
//   const [sessionSourceUrl, setSessionSourceUrl] = useState("");
//   const [user, setUser] = useState(null);
//   const [profile, setProfile] = useState(null);
//   const [authLoading, setAuthLoading] = useState(true);
//   const [shareUrl, setShareUrl] = useState(null);
//   const [shareLoading, setShareLoading] = useState(false);
//   const [wordCard, setWordCard] = useState(null); // {word, definition, example, loading}
//   const [savedWords, setSavedWords] = useState([]);
//   const [streak, setStreak] = useState(0);


//   const [sharedId, setSharedId] = useState(() => {
//       const path = window.location.pathname;
//       const match = path.match(/\/share\/([a-f0-9-]+)/);
//       return match ? match[1] : null;
//   });
//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setUser(session?.user ?? null);
//       if (session?.user) loadProfile(session.user.id);
//       else setAuthLoading(false);
//     });
//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null);
//       if (session?.user) loadProfile(session.user.id);
//       else setProfile(null);
//     });
//     return () => subscription.unsubscribe();
//   }, []);


// async function loadProfile(userId) {
//   const { data } = await supabase.from("profiles").select("nickname, level, streak, last_activity").eq("id", userId).single();
//   if (data?.nickname && data?.level) setProfile(data);
//   if (data?.streak) setStreak(data.streak);
//   setAuthLoading(false);
// }

// async function generate() {
//   const isUrl = mode === "url";
//   const value = isUrl ? url.trim() : kw.trim();
//   if (!value) return;
//   setSessionKw(isUrl ? "" : value);
//   setSessionSourceUrl(isUrl ? value : "");
//   setPhase("loading"); setErr("");
//   const randomType = Math.random() > 0.5 ? "qcm" : "vraifaux";
//   setExerciseType(randomType);
//   const endpoint = randomType === "qcm"
//     ? (isUrl ? "/generate-from-url" : "/generate-exercise")
//     : (isUrl ? "/generate-vrai-faux-url" : "/generate-vrai-faux");
//   const body = isUrl ? { url: value, level: profile.level } : { keyword: value, level: profile.level };
//   try {
//     const res = await fetch(`https://ouican.onrender.com${endpoint}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body)
//     });
//     const text = await res.text();
//     const data = JSON.parse(text);
//     if (!res.ok) throw new Error(data?.detail || "Erreur de connexion");
//     setEx(data);
//     setSourceUrl(isUrl ? value : "");
//     setVfAnswer(null);
//     setChosen(null);
//     setPhase("question");
//   } catch (e) {
//     setErr(e.message); setPhase("error");
//   }
// }

// async function explainWord(word) {
//   setWordCard({ word, definition: null, example: null, loading: true });
//   try {
//     const res = await fetch("https://ouican.onrender.com/explain-word", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ word: word.replace(/[.,!?;:«»""]/g, "").trim(), level: profile.level })
//     });
//     const data = await res.json();
//     setWordCard({ word, definition: data.definition, example: data.example, loading: false });
//   } catch(e) {
//     setWordCard(null);
//   }
// }

// async function saveWord() {
//   if (!wordCard || wordCard.loading) return;
  
//   let topic = sessionKw;
//   if (!topic && sessionSourceUrl) {
//     try {
//       topic = new URL(sessionSourceUrl).hostname.replace("www.", "");
//     } catch {
//       topic = sessionSourceUrl;
//     }
//   }

//   await supabase.from("vocabulary").insert({
//     user_id: user.id,
//     word: wordCard.word,
//     definition: wordCard.definition,
//     example: wordCard.example,
//     level: profile.level,
//     topic: topic || "Divers",
//   });
//   setSavedWords(sw => [...sw, wordCard.word]);
// }

// async function updateStreak() {
//   const today = new Date().toISOString().split("T")[0];
//   const { data } = await supabase.from("profiles").select("streak, last_activity").eq("id", user.id).single();
  
//   if (data.last_activity === today) return; // 今天已经做过了
  
//   const yesterday = new Date();
//   yesterday.setDate(yesterday.getDate() - 1);
//   const yesterdayStr = yesterday.toISOString().split("T")[0];
  
//   const newStreak = data.last_activity === yesterdayStr ? (data.streak || 0) + 1 : 1;
  
//   await supabase.from("profiles").update({
//     streak: newStreak,
//     last_activity: today,
//   }).eq("id", user.id);
  
//   setStreak(newStreak);
// }

// async function shareExercise() {
//   setShareLoading(true);
//   try {
//     const body = exerciseType === "qcm" ? {
//       exercise_type: "qcm",
//       passage: ex.passage,
//       question: ex.question,
//       options: ex.options,
//       answer: ex.answer,
//       explanation: ex.explanation,
//       level: profile.level,
//       topic: sessionKw || sessionSourceUrl,
//     } : {
//       exercise_type: "vraifaux",
//       passage: ex.passage,
//       statement: ex.statement,
//       answer: ex.answer,
//       justification: ex.justification,
//       explanation: ex.explanation,
//       level: profile.level,
//       topic: sessionKw || sessionSourceUrl,
//     };

//     const res = await fetch("https://ouican.onrender.com/share", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body)
//     });
//     const data = await res.json();
//     const url = `https://ouican.pages.dev/share/${data.id}`;
//     setShareUrl(url);
//     navigator.clipboard.writeText(url);
//   } catch(e) {
//     console.error(e);
//   } finally {
//     setShareLoading(false);
//   }
// }

//   function pick(letter) {
//     setChosen(letter);
//     setScore(s => ({ correct: s.correct + (letter === ex.answer ? 1 : 0), total: s.total + 1 }));
//     setPhase("result");
//     updateStreak();
//   }

//   function pickVF(answer) {
//     setVfAnswer(answer);
//     setScore(s => ({ correct: s.correct + (answer === ex.answer ? 1 : 0), total: s.total + 1 }));
//     setPhase("result");
//     updateStreak();
//   }

//   function resetAll() {
//     setKw(""); setUrl(""); setSourceUrl(""); setEx(null);
//     setChosen(null); setVfAnswer(null); setPhase("input");
//     setShareUrl(""); setShareLoading(false);
//     setScore({ correct: 0, total: 0 });
//     setSessionKw(""); setSessionSourceUrl("");
//   }

//   async function nextQuestion() {
//     setEx(null); setChosen(null); setVfAnswer(null);
//     setShareUrl(null);
//     setShareLoading(false);
//     setPhase("loading");
//     const randomType = Math.random() > 0.5 ? "qcm" : "vraifaux";
//     setExerciseType(randomType);
//     const isUrl = !!sessionSourceUrl;
//     const value = isUrl ? sessionSourceUrl : sessionKw;
//     const endpoint = randomType === "qcm"
//       ? (isUrl ? "/generate-from-url" : "/generate-exercise")
//       : (isUrl ? "/generate-vrai-faux-url" : "/generate-vrai-faux");
//     try {
//       const res = await fetch(`https://ouican.onrender.com${endpoint}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(isUrl ? { url: value, level: profile.level } : { keyword: value, level: profile.level })
//       });
//       const text = await res.text();
//       const data = JSON.parse(text);
//       if (!res.ok) throw new Error(data?.detail || "Erreur");
//       setEx(data);
//       setPhase("question");
//     } catch(e) {
//       setErr(e.message); setPhase("error");
//     }
//   }

//   const displayTitle = sourceUrl
//     ? new URL(sourceUrl).hostname.replace("www.", "")
//     : (kw ? kw.toUpperCase() : "ÉDITION SPÉCIALE");

//   const s = {
//     container: { minHeight: "100vh", backgroundColor: "#F9F7F2", color: "#1A1A1A", fontFamily: "'Inter', sans-serif" },
//     wrap: { maxWidth: 640, margin: "0 auto", padding: "40px 20px" },
//     card: { background: "#FFFFFF", padding: "28px", borderRadius: "16px", boxShadow: "0 12px 40px rgba(0,0,0,0.04)", border: "1px solid #EAE2D5" },
//     tabGroup: { display: "flex", background: "#F0EDE7", padding: 4, borderRadius: 12, marginBottom: 16 },
//     tab: (active) => ({ flex: 1, padding: "12px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "#FFFFFF" : "transparent", color: active ? "#123524" : "#666", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "0.2s" }),
//     input: { width: "100%", padding: "16px", fontSize: 16, borderRadius: 12, border: "2px solid #EEE", marginBottom: 12, boxSizing: "border-box", outline: "none", fontFamily: "'Libre Baskerville', serif" },
//     mainBtn: { width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: "pointer", background: "#123524", color: "#FFF", fontSize: 16, fontWeight: 700, transition: "0.1s" },
//     kicker: { fontSize: 11, fontWeight: 700, color: "#993556", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 },
//     headline: { fontFamily: "'Playfair Display', serif", fontSize: 34, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.5px" },
//     passage: { fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.8, color: "#2D2D2D", marginBottom: 30, textAlign: "justify", padding: "0 16px", borderLeft: "3px solid #123524" },
//     option: (isCorrect, isWrong, isDimmed) => ({ width: "100%", display: "flex", alignItems: "center", gap: 15, padding: "18px", marginBottom: 12, borderRadius: "12px", border: "2px solid", cursor: "pointer", textAlign: "left", transition: "0.2s", borderColor: isCorrect ? "#3B6D11" : isWrong ? "#993556" : "#EEE", background: isCorrect ? "#F4F9ED" : isWrong ? "#FFF0F3" : "#FFF", opacity: isDimmed ? 0.4 : 1 }),
//     vfBtn: (selected, isResult, isCorrect) => {
//       let borderColor = "#EEE";
//       let bg = "#FFF";
//       if (isResult && isCorrect) { borderColor = "#3B6D11"; bg = "#F4F9ED"; }
//       else if (isResult && selected && !isCorrect) { borderColor = "#993556"; bg = "#FFF0F3"; }
//       else if (!isResult && selected) { borderColor = "#123524"; bg = "#F0EDE7"; }
//       return { flex: 1, padding: "20px", borderRadius: 12, border: `2px solid ${borderColor}`, background: bg, cursor: isResult ? "default" : "pointer", fontSize: 17, fontWeight: 800, color: isResult && isCorrect ? "#3B6D11" : isResult && selected ? "#993556" : selected ? "#123524" : "#999", transition: "0.15s" };
//     },
//     feedback: { marginTop: 20, padding: "24px", borderRadius: "12px", backgroundColor: "#F8F8F8", borderLeft: "4px solid #123524", fontFamily: "'Libre Baskerville', serif", lineHeight: 1.7, color: "#444" },
//   };

//   if (authLoading) return null;
//   if (sharedId) return <SharedExercise id={sharedId} />;
//   if (!user) return <Auth />;
//   if (!profile) return <Profile user={user} onSave={(p) => setProfile(p)} onDeleteWord={(word) => setSavedWords(sw => sw.filter(w => w !== word))} />;
 
//   return (
//     <div style={s.container}>
//       <div style={s.wrap}>

//         <header style={{ textAlign: "center", borderTop: "3px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "24px 0 16px", marginBottom: 40 }}>
//           <h1 style={{ fontFamily: "'UnifrakturMaguntia', serif", fontWeight: 400, fontSize: 88, lineHeight: 0.9, color: "#123524", margin: 0, letterSpacing: -2, textShadow: "1px 1px 0px rgba(0,0,0,0.1), 3px 3px 0.5px rgba(18,53,36,0.15), 0 0 10px rgba(18,53,36,0.05)" }}>
//             OuiCan
//           </h1>
//           <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 12, textTransform: "uppercase", letterSpacing: 6, fontWeight: 400, color: "#666", marginTop: 12, display: "block", fontStyle: "italic" }}>
//             Le Français par la curiosité
//           </span>
//         </header>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
//           <span style={{ fontSize: 14, color: "#666", fontFamily: "'Libre Baskerville', serif" }}>
//             Bonjour, <strong>{profile.nickname}</strong> · {profile.level}
//             {streak > 0 && <span style={{ marginLeft: 10, color: "#E8630A", fontWeight: 700 }}>🔥 {streak}</span>}
//           </span>
//           <div style={{ display: "flex", gap: 12 }}>
//             <button onClick={() => setProfile(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#999" }}>
//               ⚙️ Profil
//             </button>
//             <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#999" }}>
//               Déconnexion
//             </button>
//           </div>
//         </div>

//         {phase === "input" && (
//           <div style={s.card}>
//             <div style={s.tabGroup}>
//               <button style={s.tab(mode === "keyword")} onClick={() => setMode("keyword")}>Mot-clé</button>
//               <button style={s.tab(mode === "url")} onClick={() => setMode("url")}>URL Article</button>
//             </div>
//             <input
//               style={s.input}
//               value={mode === "keyword" ? kw : url}
//               onChange={e => mode === "keyword" ? setKw(e.target.value) : setUrl(e.target.value)}
//               onKeyDown={e => e.key === "Enter" && generate()}
//               placeholder={mode === "keyword" ? "ex: Les JO de Paris, Simone Veil…" : "Coller l'URL d'un article…"}
//             />
//             {mode === "url" && (
//               <div style={{ fontSize: 12, color: "#999", fontStyle: "italic", marginBottom: 12 }}>
//                 Fonctionne avec RFI, France Info, Wikipedia…
//               </div>
//             )}
//             <button style={s.mainBtn} onClick={generate}>Rédiger mon sujet ↗</button>
//             <div style={{ marginTop: 20 }}>
//               <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
//                 {chips.map(c => (
//                   <span key={c} onClick={() => setKw(c)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 20, background: "#F0EDE7", cursor: "pointer", color: "#666" }}>
//                     {c}
//                   </span>
//                 ))}
//               </div>
//               <button onClick={() => setChips(shuffle(ALL_CHIPS).slice(0, 5))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#999" }}>
//                 Autres idées 🔀
//               </button>
//             </div>
//           </div>
//         )}

//         {phase === "loading" && (
//           <div style={{ textAlign: "center", padding: "60px 0" }}>
//             <div style={{ fontSize: 40, marginBottom: 20, display: "inline-block", animation: "writing 1s ease-in-out infinite alternate", transformOrigin: "bottom center" }}>✒️</div>
//             <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "#444" }}>
//               Notre rédacteur affûte sa plume...
//             </div>
//           </div>
//         )}

//         {phase === "error" && (
//           <div style={{ ...s.card, textAlign: "center" }}>
//             <div style={{ fontSize: 32, marginBottom: 12 }}>🥐</div>
//             <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 8, color: "#1A1A1A" }}>
//               {err.includes("payant") || err.includes("inaccessible")
//                 ? "Ce site n'est pas accessible…"
//                 : err.includes("connexion") || err.includes("fetch")
//                 ? "Pas de connexion, mon ami."
//                 : "Notre rédacteur a eu un moment de doute."}
//             </p>
//             <p style={{ fontSize: 13, color: "#999", fontStyle: "italic", marginBottom: 20, fontFamily: "'Libre Baskerville', serif" }}>
//               {err.includes("payant") || err.includes("inaccessible")
//                 ? "Essaie avec RFI, France Info ou Wikipedia — c'est gratuit et bien écrit."
//                 : err.includes("connexion") || err.includes("fetch")
//                 ? "Vérifie ta connexion et réessaie."
//                 : "Il a retenté, en vain. Parfois l'inspiration ne vient pas."}
//             </p>
//             <button style={s.mainBtn} onClick={resetAll}>← Recommencer</button>
//           </div>
//         )}

//         {(phase === "question" || phase === "result") && ex && (
//           <div>
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
//               <button onClick={resetAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#999", padding: 0 }}>
//                 ← Accueil
//               </button>
//               {score.total > 0 && (
//                 <span style={{ fontSize: 13, fontWeight: 700, color: "#123524" }}>
//                   {score.correct}/{score.total} ✓
//                 </span>
//               )}
//             </div>
//             <div style={s.kicker}>
//               {exerciseType === "vraifaux" ? "Vrai / Faux " : "Compréhension écrite"}
//             </div>
//             <h1 style={s.headline}>
//               {sourceUrl ? (
//                 <a href={sourceUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", borderBottom: "2px solid #EAE2D5" }}>
//                   {displayTitle} ↗
//                 </a>
//               ) : displayTitle}
//             </h1>
//             <div style={{ borderTop: "2.5px solid #1A1A1A", borderBottom: "1px solid #1A1A1A", padding: "6px 0", marginBottom: 25, fontSize: 11, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#333" }}>
//               <span>OUICAN · {new Date().toLocaleDateString('fr-FR')}</span>
//               <span>{profile?.level} PREMIUM</span>
//             </div>

//             <div style={s.passage}>
//               {ex.passage.split(/(\s+)/).map((token, i) => {
//                 const clean = token.replace(/[.,!?;:«»""]/g, "").trim();
//                 if (!clean) return <span key={i}>{token}</span>;
//                 return (
//                   <span
//                     key={i}
//                     onClick={() => explainWord(clean)}
//                     style={{ cursor: "pointer", borderBottom: "1px dotted #999", transition: "0.1s" }}
//                     onMouseEnter={e => e.target.style.color = "#123524"}
//                     onMouseLeave={e => e.target.style.color = ""}
//                   >
//                     {token}
//                   </span>
//                 );
//               })}
//             </div>

// {/* ── QCM ── */}
//             {exerciseType === "qcm" && (
//               <>
//                 <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
//                   <span style={{ background: "#123524", color: "#FFF", padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 4, letterSpacing: 1, whiteSpace: "nowrap" }}>QUESTION</span>
//                   <span style={{ fontWeight: 700, fontSize: 18, flex: 1, lineHeight: 1.4 }}>{ex.question}</span>
//                 </div>
//                 {Object.entries(ex.options).map(([letter, text]) => {
//                   const isCorrect = phase === "result" && letter === ex.answer;
//                   const isWrong = phase === "result" && chosen === letter && letter !== ex.answer;
//                   const isDimmed = phase === "result" && letter !== ex.answer && chosen !== letter;
//                   return (
//                     <button key={letter} disabled={phase === "result"} onClick={() => pick(letter)} style={s.option(isCorrect, isWrong, isDimmed)}>
//                       <span style={{ fontWeight: 800, width: 28, fontSize: 18, color: "#123524", flexShrink: 0 }}>{letter}.</span>
//                       <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16 }}>{text}</span>
//                     </button>
//                   );
//                 })}
//                 {phase === "result" && (
//                   <div style={s.feedback}>
//                     <div style={{ fontWeight: 700, color: chosen === ex.answer ? "#3B6D11" : "#993556", marginBottom: 10, fontSize: 15, letterSpacing: 1 }}>
//                       {chosen === ex.answer ? "✓ EXCELLENT !" : "✗ ANALYSE À REVOIR..."}
//                     </div>
//                     <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #EEE" }}>
//                       {shareUrl ? (
//                         <div style={{ fontSize: 13, color: "#3B6D11", fontFamily: "'Libre Baskerville', serif" }}>
//                           ✓ Lien copié ! <span style={{ color: "#999" }}>{shareUrl}</span>
//                         </div>
//                       ) : (
//                         <button onClick={shareExercise} disabled={shareLoading} style={{ background: "none", border: "0.5px solid #EEE", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#666" }}>
//                           {shareLoading ? "..." : "🔗 Partager cette question"}
//                         </button>
//                       )}
//                     </div>
//                     <div style={{ fontStyle: "italic" }}>{ex.explanation}</div>
//                     <button style={{ ...s.mainBtn, marginTop: 24 }} onClick={nextQuestion}>Prochain sujet</button>
//                   </div>
//                 )}
//               </>
//             )}

//             {/* ── Vrai / Faux ── */}
//             {exerciseType === "vraifaux" && (
//               <>
//                 <div style={{ marginBottom: 24, padding: "20px", background: "#FFF", borderRadius: 12, border: "2px solid #EAE2D5" }}>
//                   <div style={{ fontSize: 11, fontWeight: 700, color: "#993556", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Affirmation</div>
//                   <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{ex.statement}</div>
//                 </div>
//                 <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
//                   <button disabled={phase === "result"} onClick={() => pickVF("vrai")} style={s.vfBtn(vfAnswer === "vrai", phase === "result", phase === "result" && ex.answer === "vrai")}>✓ Vrai</button>
//                   <button disabled={phase === "result"} onClick={() => pickVF("faux")} style={s.vfBtn(vfAnswer === "faux", phase === "result", phase === "result" && ex.answer === "faux")}>✗ Faux</button>
//                 </div>
//                 {phase === "result" && (
//                   <div style={s.feedback}>
//                     <div style={{ fontWeight: 700, color: vfAnswer === ex.answer ? "#3B6D11" : "#993556", marginBottom: 10, fontSize: 15, letterSpacing: 1 }}>
//                       {vfAnswer === ex.answer ? "✓ EXCELLENT !" : `✗ C'était ${ex.answer.toUpperCase()}`}
//                     </div>
//                     <div style={{ fontStyle: "italic", marginBottom: 12 }}>{ex.explanation}</div>
//                     <div style={{ fontSize: 13, color: "#888", borderTop: "1px solid #EEE", paddingTop: 12 }}>
//                       <span style={{ fontWeight: 700, color: "#555" }}>Idée clé : </span>{ex.justification}
//                     </div>
//                     <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #EEE" }}>
//                       {shareUrl ? (
//                         <div style={{ fontSize: 13, color: "#3B6D11", fontFamily: "'Libre Baskerville', serif" }}>
//                           ✓ Lien copié ! <span style={{ color: "#999" }}>{shareUrl}</span>
//                         </div>
//                       ) : (
//                         <button onClick={shareExercise} disabled={shareLoading} style={{ background: "none", border: "0.5px solid #EEE", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#666" }}>
//                           {shareLoading ? "..." : "🔗 Partager cette question"}
//                         </button>
//                       )}
//                     </div>
//                     <button style={{ ...s.mainBtn, marginTop: 24 }} onClick={nextQuestion}>Prochain sujet</button>
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         )}
//         {wordCard && (
//           <div
//             onClick={() => setWordCard(null)}
//             style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 20 }}
//           >
//             <div
//               onClick={e => e.stopPropagation()}
//               style={{ background: "#FFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 600, boxShadow: "0 -4px 40px rgba(0,0,0,0.1)" }}
//             >
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
//                 <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#123524" }}>
//                   {wordCard.word}
//                 </span>
//                 <button onClick={() => setWordCard(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999" }}>✕</button>
//               </div>
//               {wordCard.loading ? (
//                 <div style={{ color: "#999", fontStyle: "italic", fontFamily: "'Libre Baskerville', serif" }}>Définition en cours...</div>
//               ) : (
//                 <>
//                   <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 15, lineHeight: 1.7, color: "#333", marginBottom: 12 }}>
//                     {wordCard.definition}
//                   </div>
//                   <div style={{ fontSize: 13, color: "#888", fontStyle: "italic", borderLeft: "3px solid #EAE2D5", paddingLeft: 12, marginBottom: 20 }}>
//                     {wordCard.example}
//                   </div>
//                   <button
//                     onClick={saveWord}
//                     disabled={savedWords.includes(wordCard.word)}
//                     style={{ background: savedWords.includes(wordCard.word) ? "#F0EDE7" : "#123524", color: savedWords.includes(wordCard.word) ? "#999" : "#FFF", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: savedWords.includes(wordCard.word) ? "default" : "pointer", fontWeight: 700 }}
//                   >
//                     {savedWords.includes(wordCard.word) ? "✓ Sauvegardé" : "💾 Sauvegarder"}
//                   </button>
//                 </>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }