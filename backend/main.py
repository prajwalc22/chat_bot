import os
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.genai as genai
from google.genai import errors as genai_errors

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in .env")

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

# FastAPI app
app = FastAPI()

# Allow frontend running on Vite dev server
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Simple chat endpoint using Gemini 2.0 Flash.
    Takes the conversation history and sends it as one prompt.
    """

    # Only keep the last 10 messages to avoid huge prompts
    trimmed_messages = req.messages[-10:]

    history_lines = []
    for m in trimmed_messages:
        role = m.role.lower()
        if role == "assistant":
            prefix = "Assistant"
        elif role == "system":
            prefix = "System"
        else:
            prefix = "User"
        history_lines.append(f"{prefix}: {m.content}")

    prompt = "\n".join(history_lines)

    # Try calling Gemini with retries for overloaded (503) cases
    MAX_RETRIES = 3

    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )

            reply_text = response.text or ""
            if not reply_text:
                reply_text = "No response from model."

            return ChatResponse(reply=reply_text)

        except genai_errors.ServerError as e:
            # 503 or other server-side issues from Gemini
            print(f"Gemini ServerError (attempt {attempt + 1}):", e)
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=503,
                    detail="Gemini model is overloaded or temporarily unavailable. Try again later.",
                )

        except genai_errors.APIError as e:
            # Client-side / quota / invalid request issues from Gemini
            print("Gemini APIError:", e)
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API error: {str(e)}",
            )

        except Exception as e:
            # Any other unexpected error
            print("Unexpected error:", e)
            raise HTTPException(
                status_code=500,
                detail="Internal server error",
            )

    # Fallback, theoretically unreachable
    raise HTTPException(
        status_code=500,
        detail="Unexpected error after retries.",
    )
