"""ChromaDB setup, corpus loading and hybrid (vector + keyword) retrieval."""
import hashlib
import json
import logging
import math
import re
from typing import Dict, List, Optional

import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings

from . import config

log = logging.getLogger("nyayamitra.vector")

_STOP = set(
    "a an the is are was were be been of to in on at for and or if what which who whom how does do did can i my me "
    "it its this that with by as from about under law act when where why any there their they he she his her not "
    "would should could will shall have has had".split()
)
_DIM = 512


def _tokens(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in _STOP and len(t) > 1]


class HashEmbeddingFunction(EmbeddingFunction[Documents]):
    """Offline hashed bag-of-words embedding, used when the ONNX model is unavailable."""

    def __init__(self):
        pass

    def __call__(self, input: Documents) -> Embeddings:
        out = []
        for doc in input:
            vec = [0.0] * _DIM
            toks = _tokens(doc)
            # light stemming so "stealing"/"stolen"/"steal" overlap
            feats = toks + [t[:5] for t in toks if len(t) > 5] + [a + "_" + b for a, b in zip(toks, toks[1:])]
            for f in feats:
                h = int(hashlib.md5(f.encode()).hexdigest(), 16)
                vec[h % _DIM] += 1.0
            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
            out.append([v / norm for v in vec])
        return out

    @staticmethod
    def name() -> str:
        return "nyayamitra-hash"

    def get_config(self) -> Dict:
        return {}

    @staticmethod
    def build_from_config(config: Dict) -> "HashEmbeddingFunction":
        return HashEmbeddingFunction()


_corpus: List[dict] = []
_by_number: Dict[str, dict] = {}
_collection = None
_backend = "hash"


def load_corpus() -> List[dict]:
    global _corpus, _by_number
    if not _corpus:
        with open(config.CORPUS_PATH, encoding="utf-8") as f:
            _corpus = json.load(f)
        _by_number = {s["section_number"]: s for s in _corpus}
    return _corpus


def get_section(number: str) -> Optional[dict]:
    load_corpus()
    return _by_number.get(str(number).strip())


def _doc_text(s: dict) -> str:
    return f"BNS Section {s['section_number']}: {s['title']}. {s['chapter']}. {' '.join(s['keywords'])}. {s['text']}"


def _open_collection(client, backend: str):
    if backend == "default":
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

        ef = DefaultEmbeddingFunction()
        ef(["warm up"])  # forces the model download / load now so we can fall back on failure
    else:
        ef = HashEmbeddingFunction()
    return client.get_or_create_collection(
        f"bns_sections_{backend}", embedding_function=ef, metadata={"hnsw:space": "cosine"}
    )


def init_vector_store():
    """Create the persistent collection and index any sections that are missing."""
    global _collection, _backend
    corpus = load_corpus()
    client = chromadb.PersistentClient(path=config.CHROMA_PATH)
    backend = config.EMBEDDING_BACKEND
    try:
        _collection = _open_collection(client, backend)
    except Exception as exc:
        log.warning("Embedding backend '%s' unavailable (%s); using offline hash embeddings", backend, exc)
        backend = "hash"
        _collection = _open_collection(client, backend)
    _backend = backend

    existing = set(_collection.get(include=[])["ids"])
    missing = [s for s in corpus if f"bns-{s['section_number']}" not in existing]
    if missing:
        _collection.add(
            ids=[f"bns-{s['section_number']}" for s in missing],
            documents=[_doc_text(s) for s in missing],
            metadatas=[{"section_number": s["section_number"], "title": s["title"]} for s in missing],
        )
        log.info("Indexed %d BNS sections (%s embeddings)", len(missing), backend)


def _keyword_score(query_toks: set, s: dict) -> float:
    if not query_toks:
        return 0.0
    kw = " ".join(s["keywords"]).lower()
    title = s["title"].lower()
    score = 0.0
    for t in query_toks:
        stem = t[:5]
        if t in title or stem in title:
            score += 0.5
        if t in kw or stem in kw:
            score += 0.4
    return min(score, 1.0)


def search_sections(query: str, k: Optional[int] = None) -> List[dict]:
    """Hybrid search: Chroma cosine similarity blended with keyword/title overlap."""
    k = k or config.TOP_K
    corpus = load_corpus()
    if _collection is None:
        init_vector_store()

    # explicit "section 303" style references get top priority
    forced = [m for m in re.findall(r"(?:section|sec\.?|s\.)\s*(\d{1,3})", query, re.I) if m in _by_number]

    res = _collection.query(query_texts=[query], n_results=min(len(corpus), max(k * 3, 8)))
    scores: Dict[str, float] = {}
    for sid, dist in zip(res["ids"][0], res["distances"][0]):
        scores[sid.replace("bns-", "")] = max(0.0, 1.0 - dist)

    q = set(_tokens(query))
    ranked = []
    for s in corpus:
        n = s["section_number"]
        total = 0.6 * scores.get(n, 0.0) + 0.4 * _keyword_score(q, s)
        if n in forced:
            total += 1.0
        ranked.append((total, s))
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [{**s, "relevance": round(sc, 3)} for sc, s in ranked[:k] if sc > 0.05]
