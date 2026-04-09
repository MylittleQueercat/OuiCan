// API SERVICE: All backend fetch calls
const BASE_URL = "https://ouican.onrender.com";

export const fetchExerciseApi = async (isUrl, value, level) => {
  // 1. 随机决定题目类型
  const type = Math.random() > 0.5 ? "qcm" : "vraifaux";
  
  // 2. 根据类型和输入方式选择接口
  const endpoint = type === "qcm"
    ? (isUrl ? "/generate-from-url" : "/generate-exercise")
    : (isUrl ? "/generate-vrai-faux-url" : "/generate-vrai-faux");
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isUrl ? { url: value, level } : { keyword: value, level })
  });

  const text = await res.text();
  const data = JSON.parse(text);
  
  if (!res.ok) throw new Error(data?.detail || "Erreur de connexion");
  
  return { data, type };
};

export const fetchWordExplanation = async (word, level) => {
  const res = await fetch(`${BASE_URL}/explain-word`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      word: word.replace(/[.,!?;:«»""]/g, "").trim(), 
      level 
    })
  });
  return await res.json();
};

export const createShareLink = async (payload) => {
  const res = await fetch(`${BASE_URL}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await res.json();
};