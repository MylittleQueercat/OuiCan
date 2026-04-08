from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from groq import Groq
from supabase import create_client
import orjson
import json
import re
import os
import traceback
from dotenv import load_dotenv
import newspaper

load_dotenv()

app = FastAPI(title="OuiCan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ouican.pages.dev",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

supabase_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# ── Prompts ───────────────────────────────────────────────────────────────────

LEVEL_DESC = {
    "A1": "phrases très courtes et isolées, vocabulaire limité au quotidien immédiat (se présenter, nommer des objets, chiffres, jours), présent uniquement, pas de subordination. Longueur du passage : 40-60 mots maximum. IMPORTANT : si le sujet est complexe, crée un dialogue simple entre deux personnes qui abordent ce sujet de façon très basique. Ne jamais abandonner le sujet, toujours le relier même indirectement.",
    "A2": "phrases simples reliées par 'et', 'mais', 'parce que', situations familières (achats, transports, famille), passé composé et futur proche. Longueur du passage : 60-90 mots. IMPORTANT : si le sujet est complexe, crée un dialogue ou une situation concrète qui l'illustre simplement. Reste toujours lié au sujet.",
    "B1": "textes sur des sujets familiers (travail, voyages, actualité simple), connecteurs logiques, imparfait et conditionnel présent. Longueur du passage : 90-120 mots.",
    "B2": "textes complexes sur des sujets abstraits ou sociaux, argumentation, subjonctif, vocabulaire soutenu. Longueur du passage : 130-160 mots.",
    "C1": "textes littéraires ou journalistiques longs, nuances stylistiques fines, registres variés, implicite et sous-entendu. Longueur du passage : 160-200 mots.",
    "C2": "maîtrise parfaite, textes abstraits ou spécialisés, ironie, jeux de mots, références culturelles profondes, syntaxe très complexe. Longueur du passage : 200-250 mots.",
}


def get_explanation_note(level: str) -> str:
    if level in ["A1", "A2"]:
        return "en français très simple, mots courants uniquement, phrases de moins de 10 mots, très encourageante et chaleureuse, avec beaucoup d'enthousiasme et de félicitations même si la réponse est fausse"
    return "courte, bienveillante et légèrement espiègle"


def get_system_qcm(level: str) -> str:
    desc = LEVEL_DESC.get(level, "avancé")
    explanation_note = get_explanation_note(level)
    variety_note = (
        "Varie le type de question (cause, but, sentiment, définition...). "
        "Options A/B/C/D : jamais les mots exacts du passage, toujours des synonymes ou reformulations."
    )
    return f"""Tu es un prof de FLE DELF/DALF. Crée un QCM niveau {level}.
{level} : {desc}
{variety_note}
JSON uniquement, pas de markdown :
{{"passage":"...","question":"...","options":{{"A":"...","B":"...","C":"...","D":"..."}},"answer":"A/B/C/D","explanation":"explication {explanation_note}"}}"""


def get_system_vrai_faux(level: str) -> str:
    desc = LEVEL_DESC.get(level, "avancé")
    explanation_note = get_explanation_note(level)
    vf_note = "L'affirmation : jamais les mots exacts du passage, reformule avec synonymes."
    return f"""Tu es un prof de FLE DELF/DALF. Crée un Vrai/Faux niveau {level}.
{level} : {desc}
{vf_note}
JSON uniquement, pas de markdown :
{{"passage":"...","statement":"...","answer":"vrai/faux","justification":"...","explanation":"explication {explanation_note}"}}"""

# ── Models ────────────────────────────────────────────────────────────────────

class ExerciseRequest(BaseModel):
    keyword: str
    level: str = "B1"

class UrlRequest(BaseModel):
    url: str
    level: str = "B1"

class VraiFauxRequest(BaseModel):
    keyword: str
    level: str = "B1"

class UrlVraiFauxRequest(BaseModel):
    url: str
    level: str = "B1"

class EvaluateRequest(BaseModel):
    passage: str
    statement: str
    correct_answer: str
    correct_justification: str
    user_answer: str
    user_justification: str

class ExerciseResponse(BaseModel):
    passage: str
    question: str
    options: dict
    answer: str
    explanation: str

class VraiFauxResponse(BaseModel):
    passage: str
    statement: str
    answer: str
    justification: str
    explanation: str

class EvaluateResponse(BaseModel):
    correct: bool
    score: str
    feedback: str

class ShareRequest(BaseModel):
    exercise_type: str
    passage: str
    question: str = None
    options: dict = None
    answer: str
    explanation: str
    statement: str = None
    justification: str = None
    level: str = None
    topic: str = None

# ── Helpers ───────────────────────────────────────────────────────────────────

def call_groq(system: str, user: str, retry: bool = True) -> dict:
    try:
        message = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        raw = message.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)
        return json.loads(raw)
    except Exception as e:
        if retry:
            return call_groq(system, user, retry=False)
        raise


def fetch_article(url: str) -> str:
    try:
        article = newspaper.Article(url, language='fr')
        article.download()
        article.parse()
    except Exception:
        raise HTTPException(status_code=422, detail="Ce site n'est pas accessible — essaie avec RFI, France Info ou Wikipedia !")
    if not article.text or len(article.text.strip()) < 100:
        raise HTTPException(status_code=422, detail="Ce site n'est pas accessible — essaie avec RFI, France Info ou Wikipedia !")
    return article.text[:1500]

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "OuiCan API is running"}


@app.post("/generate-exercise", response_model=ExerciseResponse)
def generate_exercise(req: ExerciseRequest):
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="keyword cannot be empty")
    try:
        result = call_groq(get_system_qcm(req.level), f"Sujet : {req.keyword}")
        return Response(content=orjson.dumps(result), media_type="application/json")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-from-url", response_model=ExerciseResponse)
def generate_from_url(req: UrlRequest):
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="url cannot be empty")
    try:
        content = fetch_article(req.url)
        result = call_groq(get_system_qcm(req.level), f"Voici un article de presse. Crée un exercice DELF basé sur ce texte :\n\n{content}")
        return Response(content=orjson.dumps(result), media_type="application/json")
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-vrai-faux", response_model=VraiFauxResponse)
def generate_vrai_faux(req: VraiFauxRequest):
    if not req.keyword.strip():
        raise HTTPException(status_code=400, detail="keyword cannot be empty")
    try:
        result = call_groq(get_system_vrai_faux(req.level), f"Sujet : {req.keyword}")
        return Response(content=orjson.dumps(result), media_type="application/json")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-vrai-faux-url", response_model=VraiFauxResponse)
def generate_vrai_faux_url(req: UrlVraiFauxRequest):
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="url cannot be empty")
    try:
        content = fetch_article(req.url)
        result = call_groq(get_system_vrai_faux(req.level), f"Voici un article de presse. Crée un exercice Vrai/Faux basé sur ce texte :\n\n{content}")
        return Response(content=orjson.dumps(result), media_type="application/json")
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate-justification", response_model=EvaluateResponse)
def evaluate_justification(req: EvaluateRequest):
    try:
        user_content = f"""Texte original :
{req.passage}

Affirmation : {req.statement}
Réponse correcte : {req.correct_answer}
Justification attendue : {req.correct_justification}

Réponse de l'apprenant : {req.user_answer}
Justification de l'apprenant : {req.user_justification}"""
        result = call_groq(SYSTEM_EVALUATE, user_content)
        return Response(content=orjson.dumps(result), media_type="application/json")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/share")
def share_exercise(req: ShareRequest):
    try:
        result = supabase_client.table("shared_exercises").insert({
            "exercise_type": req.exercise_type,
            "passage": req.passage,
            "question": req.question,
            "options": req.options,
            "answer": req.answer,
            "explanation": req.explanation,
            "statement": req.statement,
            "justification": req.justification,
            "level": req.level,
            "topic": req.topic,
        }).execute()
        return {"id": result.data[0]["id"]}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
class WordRequest(BaseModel):
    word: str
    level: str

@app.post("/explain-word")
async def explain_word(req: WordRequest):
    system = f"""Professeur FLE. Explique le mot en français, niveau {req.level}. Langage inclusif (personnes/on, pas de genre).
JSON uniquement : {{"definition":"...","example":"..."}}"""

    result = call_groq(system, f"Explique le mot : {req.word}")
    return result