"""GenAI client: Gemini first, then Groq, then Ollama, with retry/backoff on transient errors."""
import logging
import time
from typing import List, Tuple

import httpx

from . import config

log = logging.getLogger("nyayamitra.llm")

RETRYABLE = {408, 429, 500, 502, 503, 504}

SYSTEM_PROMPT = (
    "You are NyayaMitra AI, an assistant for Indian criminal law based on the Bharatiya Nyaya Sanhita (BNS), 2023. "
    "Answer ONLY using the statutory context provided. Cite sections inline like [BNS 303]. "
    "If the context does not cover the question, say so plainly and do not invent sections or penalties. "
    "Use clear plain language, short paragraphs or bullets, mention punishment where relevant, and end with a one-line "
    "reminder that this is general information, not legal advice."
)


def build_prompt(query: str, sections: List[dict]) -> str:
    ctx = "\n\n".join(
        f"[BNS {s['section_number']}] {s['title']} ({s['chapter']})\n{s['text']}\nPunishment: {s.get('punishment', 'n/a')}"
        for s in sections
    )
    return f"STATUTORY CONTEXT:\n{ctx}\n\nUSER QUESTION:\n{query}\n\nGrounded answer:"


class TransientError(Exception):
    pass


def _gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{config.GEMINI_MODEL}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
    }
    r = httpx.post(url, json=body, headers={"x-goog-api-key": config.GEMINI_API_KEY}, timeout=config.LLM_TIMEOUT)
    _raise_for(r)
    parts = r.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts).strip()


def _groq(prompt: str) -> str:
    r = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {config.GROQ_API_KEY}"},
        json={
            "model": config.GROQ_MODEL,
            "temperature": 0.2,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        },
        timeout=config.LLM_TIMEOUT,
    )
    _raise_for(r)
    return r.json()["choices"][0]["message"]["content"].strip()


def _ollama(prompt: str) -> str:
    r = httpx.post(
        f"{config.OLLAMA_URL.rstrip('/')}/api/chat",
        json={
            "model": config.OLLAMA_MODEL,
            "stream": False,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        },
        timeout=config.LLM_TIMEOUT * 3,
    )
    _raise_for(r)
    return r.json()["message"]["content"].strip()


def _raise_for(r: httpx.Response):
    if r.status_code in RETRYABLE:
        raise TransientError(f"HTTP {r.status_code}")
    r.raise_for_status()


def _providers():
    p = []
    if config.GEMINI_API_KEY:
        p.append(("gemini", _gemini))
    if config.GROQ_API_KEY:
        p.append(("groq", _groq))
    if config.OLLAMA_URL:
        p.append(("ollama", _ollama))
    return p


def extractive_answer(sections: List[dict]) -> str:
    if not sections:
        return (
            "I could not find a matching provision in the BNS sections currently available. "
            "Try rephrasing, or browse the Section Explorer. This is general information, not legal advice."
        )
    lines = ["The AI service is currently unavailable, so here are the most relevant provisions I found:\n"]
    for s in sections:
        lines.append(f"- **BNS {s['section_number']} - {s['title']}**: {s.get('punishment', '')}")
    lines.append("\nOpen a citation card to read the full text. This is general information, not legal advice.")
    return "\n".join(lines)


def generate_answer(query: str, sections: List[dict]) -> Tuple[str, str]:
    """Returns (answer, provider). Retries transient failures per provider, then falls through."""
    if not sections:
        return extractive_answer(sections), "none"
    prompt = build_prompt(query, sections)
    for name, fn in _providers():
        for attempt in range(config.LLM_MAX_RETRIES):
            try:
                text = fn(prompt)
                if text:
                    return text, name
                break
            except (TransientError, httpx.TransportError) as exc:
                wait = 2**attempt * 0.75
                log.warning("%s transient error (%s), attempt %d", name, exc, attempt + 1)
                if attempt < config.LLM_MAX_RETRIES - 1:
                    time.sleep(wait)
            except Exception as exc:  # auth errors, bad payloads: move on to next provider
                log.warning("%s failed: %s", name, exc)
                break
    return extractive_answer(sections), "retrieval-only"
