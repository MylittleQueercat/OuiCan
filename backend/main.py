from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from groq import Groq
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
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ── Prompts ──────────────────────────────────────────────────────────────────

SYSTEM_QCM = """Tu es un professeur de FLE expert en DELF/DALF. Crée un exercice de compréhension écrite B2 à partir d'un sujet ou d'un texte.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni backticks.
Structure exacte :
{"passage":"texte authentique 130-160 mots en français niveau B2","question":"question de compréhension B2","options":{"A":"option A","B":"option B","C":"option C","D":"option D"},"answer":"A ou B ou C ou D","explanation":"explication courte et bienveillante, légèrement espiègle"}
Le passage doit avoir vocabulaire soutenu, structures complexes, être culturellement ancré."""

SYSTEM_VRAI_FAUX = """Tu es un professeur de FLE expert en DELF/DALF. Crée un exercice Vrai/Faux/Justifiez de niveau B2.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni backticks.
Structure exacte :
{"passage":"texte authentique 150-180 mots en français niveau B2","statement":"une affirmation sur le texte, vraie ou fausse","answer":"vrai ou faux","justification":"la phrase ou l'idée du texte qui justifie la réponse (en langage naturel, pas une copie exacte)","explanation":"explication bienveillante et légèrement espiègle pour l'apprenant"}
Le passage doit être riche, ambigu par endroits, pour que l'exercice soit vraiment challengeant."""

SYSTEM_EVALUATE = """Tu es un correcteur expert en DELF/DALF. Tu évalues la justification d'un apprenant pour un exercice Vrai/Faux.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni backticks.
Structure exacte :
{"correct":true ou false,"score":"0/2 ou 1/2 ou 2/2","feedback":"commentaire bienveillant et précis : est-ce que l'apprenant a bien reformulé l'idée du texte ? A-t-il copié mot pour mot (non autorisé) ? Qu'est-ce qui manque ou est bien fait ?"}
Critères : 2/2 = bonne reformulation de l'idée clé sans copier ; 1/2 = idée partiellement juste ou reformulation trop proche du texte original ; 0/2 = hors sujet ou incompréhensible."""

# ── Models ────────────────────────────────────────────────────────────────────

class ExerciseRequest(BaseModel):
    keyword: str

class UrlRequest(BaseModel):
    url: str

class VraiFauxRequest(BaseModel):
    keyword: str

class UrlVraiFauxRequest(BaseModel):
    url: str

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

# ── Helpers ───────────────────────────────────────────────────────────────────

def call_groq(system: str, user: str, retry: bool = True) -> dict:
    try:
        message = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
    except (json.JSONDecodeError, Exception) as e:
        if retry:
            return call_groq(system, user, retry=False)
        raise

def fetch_article(url: str) -> str:
    article = newspaper.Article(url, language='fr')
    article.download()
    article.parse()
    if not article.text or len(article.text.strip()) < 100:
        raise HTTPException(status_code=422, detail="Article inaccessible ou trop court (site payant ?)")
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
        result = call_groq(SYSTEM_QCM, f"Sujet : {req.keyword}")
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
        result = call_groq(SYSTEM_QCM, f"Voici un article de presse. Crée un exercice DELF B2 basé sur ce texte :\n\n{content}")
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
        result = call_groq(SYSTEM_VRAI_FAUX, f"Sujet : {req.keyword}")
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
        result = call_groq(SYSTEM_VRAI_FAUX, f"Voici un article de presse. Crée un exercice Vrai/Faux/Justifiez basé sur ce texte :\n\n{content}")
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
Justification attendue (idée clé) : {req.correct_justification}

Réponse de l'apprenant : {req.user_answer}
Justification de l'apprenant : {req.user_justification}"""

        result = call_groq(SYSTEM_EVALUATE, user_content)
        return Response(content=orjson.dumps(result), media_type="application/json")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
