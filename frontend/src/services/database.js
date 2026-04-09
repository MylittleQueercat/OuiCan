// DATABASE SERVICE: All Supabase interactions
import { supabase } from "../supabase";

export const loadProfileDb = async (userId) => {
  const { data } = await supabase
    .from("profiles")
    .select("nickname, level, streak, last_activity")
    .eq("id", userId)
    .single();
  return data;
};

export const updateStreakDb = async (userId) => {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase.from("profiles").select("streak, last_activity").eq("id", userId).single();
  
  if (data.last_activity === today) return data.streak; // 今天已更新过
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  const newStreak = data.last_activity === yesterdayStr ? (data.streak || 0) + 1 : 1;
  
  await supabase.from("profiles").update({
    streak: newStreak,
    last_activity: today,
  }).eq("id", userId);
  
  return newStreak;
};

export const saveVocabularyDb = async (userId, wordCard, level, topic) => {
  return await supabase.from("vocabulary").insert({
    user_id: userId,
    word: wordCard.word,
    definition: wordCard.definition,
    example: wordCard.example,
    level: level,
    topic: topic || "Divers",
  });
};