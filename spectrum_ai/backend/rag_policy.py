# initialized = False

# def init_rag():
#     global initialized
#     if initialized:
#         return
#     print("Loading policy RAG...")
#     # load PDFs, embeddings, FAISS
#     initialized = True
#     print("RAG ready.")




# def enforce_policy(alloc_dict):
#     # simplified policy guardian
#     CAP = 50

#     for r in alloc_dict:
#         alloc_dict[r] = min(alloc_dict[r], CAP)

#     return alloc_dict

# backend/rag_policy.py

import os, requests, re
import numpy as np
import faiss
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

# -------------------------
# CONFIG
# -------------------------
SOURCE_URLS = [
    "https://www.trai.gov.in/sites/default/files/2024-11/CP_29092023.pdf",
    "https://trai.gov.in/sites/default/files/2024-09/Consultation_Paper_27092023.pdf",
    "https://www.trai.gov.in/sites/default/files/2025-02/Recommendations_04022025.pdf",
    "https://itshamradio.com/wp-content/uploads/2022/10/National-Frequency-Allocation-Plan-2022.pdf",
    "https://egazette.gov.in/WriteReadData/2023/250880.pdf",
]

PDF_DIR = "policy_docs"
MODEL_NAME = "all-MiniLM-L6-v2"

embedder = None
index = None
chunks = []
initialized = False


# -------------------------
# Download PDFs
# -------------------------
def download_pdfs():
    os.makedirs(PDF_DIR, exist_ok=True)
    paths = []
    headers = {"User-Agent": "Mozilla/5.0"}

    for i, url in enumerate(SOURCE_URLS):
        r = requests.get(url, headers=headers)
        if "application/pdf" in r.headers.get("Content-Type", ""):
            path = f"{PDF_DIR}/doc_{i}.pdf"
            open(path, "wb").write(r.content)
            paths.append(path)
        else:
            print("Skipped:", url)

    return paths


# -------------------------
# Text Extraction
# -------------------------
def extract_text(paths):
    texts = []
    for p in paths:
        reader = PdfReader(p)
        for page in reader.pages:
            txt = page.extract_text()
            if txt:
                texts.append(txt)
    return texts


def chunk_text(texts, size=500):
    out = []
    for t in texts:
        words = t.split()
        for i in range(0, len(words), size):
            out.append(" ".join(words[i:i+size]))
    return out


# -------------------------
# RAG Initialization
# -------------------------
def init_rag():
    global embedder, index, chunks, initialized

    if initialized:
        return

    print("Initializing Policy RAG...")

    pdfs = download_pdfs()
    raw_text = extract_text(pdfs)
    chunks = chunk_text(raw_text)

    embedder = SentenceTransformer(MODEL_NAME)
    embeddings = embedder.encode(chunks)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings))

    initialized = True
    print("Policy RAG Ready.")


# -------------------------
# Retrieval
# -------------------------
def rag_retrieve(query, k=3):
    q_emb = embedder.encode([query])
    D, I = index.search(np.array(q_emb), k)
    return [chunks[i] for i in I[0]]


# -------------------------
# Extract MHz from policy text
# -------------------------
def extract_max_bw(texts):
    for t in texts:
        m = re.search(r'(\d+)\s*MHz', t)
        if m:
            return float(m.group(1))
    return 50.0  # fallback cap


# -------------------------
# Policy Guardian
# -------------------------
# def enforce_policy(alloc_dict):
#     approved = {}

#     for region, bw in alloc_dict.items():
#         docs = rag_retrieve(
#             "maximum spectrum bandwidth allowed per operator in India"
#         )
#         max_allowed = extract_max_bw(docs)

#         approved[region] = min(bw, max_allowed)

#     return approved

# def enforce_policy(alloc_dict):
#     approved = {}

#     for region, bw in alloc_dict.items():
#         docs = rag_retrieve(
#             "maximum spectrum bandwidth allowed per operator in India"
#         )

#         # max_allowed = extract_max_bw(docs)
#         max_allowed = 50.0
#         final_bw = min(bw, max_allowed)

#         approved[region] = {
#             "final": float(final_bw),
#             "policy_cap": float(max_allowed),
#             "status": "CAPPED" if bw > max_allowed else "OK"
#         }

#     return approved


# def enforce_policy(alloc_dict, initial_dict):
#     approved = {}

#     for region, bw in alloc_dict.items():
#         docs = rag_retrieve(
#             "maximum spectrum bandwidth allowed per operator in India"
#         )

#         max_allowed = extract_max_bw(docs)

#         HARD_CAP = 50.0
#         max_allowed = min(max_allowed, HARD_CAP)

#         final_bw = min(bw, max_allowed)

#         allocation_reason = generate_allocation_reason(
#             region, bw, initial_dict[region]
#         )

#         if bw > max_allowed:
#             policy_reason = (
#                 "Allocation exceeds regulatory threshold. "
#                 "TRAI/NFAP policy restricts spectrum per operator "
#                 "to a maximum permissible limit."
#             )
#         else:
#             policy_reason = "Allocation complies with national spectrum policy."

#         approved[region] = {
#             "final": float(final_bw),
#             "policy_cap": float(max_allowed),
#             "status": "CAPPED" if bw > max_allowed else "OK",
#             "allocation_reason": allocation_reason,
#             "policy_reason": policy_reason
#         }

#     return approved


# def enforce_policy(alloc_dict, initial_dict):
#     approved = {}

#     for region, bw in alloc_dict.items():
#         docs = rag_retrieve(
#             "maximum spectrum bandwidth allowed per operator in India"
#         )

#         max_allowed = extract_max_bw(docs)

#         HARD_CAP = 50.0
#         max_allowed = min(max_allowed, HARD_CAP)

#         if bw <= max_allowed:
#             final_bw = bw
#             status = "OK"
#         else:
#             alpha = 0.2
#             final_bw = max_allowed + alpha * (bw - max_allowed)
#             status = "SOFT-CAPPED"

#         allocation_reason = generate_allocation_reason(
#             region, bw, initial_dict[region]
#         )

#         policy_reason = (
#             "Soft regulatory penalty applied to discourage exceeding "
#             "maximum recommended spectrum while preserving relative demand differences."
#             if bw > max_allowed else
#             "Allocation complies with national spectrum policy."
#         )

#         approved[region] = {
#             "final": float(final_bw),
#             "policy_cap": float(max_allowed),
#             "status": status,
#             "allocation_reason": allocation_reason,
#             "policy_reason": policy_reason
#         }

#     return approved


def enforce_policy(alloc_dict, initial_dict):
    approved = {}

    # ---- First pass: policy-aware soft capping ----
    for region, bw in alloc_dict.items():

        docs = rag_retrieve(
            "maximum spectrum bandwidth allowed per operator in India"
        )

        max_allowed = extract_max_bw(docs)
        HARD_CAP = 50.0
        max_allowed = min(max_allowed, HARD_CAP)

        initial_bw = initial_dict[region]

        # congestion estimate
        congestion = max(0, (bw - initial_bw) / (initial_bw + 1e-6))
        congestion = min(congestion, 1.0)

        alpha = compute_alpha(congestion)

        if bw <= max_allowed:
            final_bw = bw
            status = "OK"
        else:
            final_bw = max_allowed + alpha * (bw - max_allowed)
            status = "SOFT-CAPPED"

        allocation_reason = generate_allocation_reason(
            region, bw, initial_bw
        )

        policy_reason = (
            f"Soft penalty applied using congestion-aware alpha={alpha:.2f} "
            f"to discourage exceeding policy threshold."
            if bw > max_allowed else
            "Allocation complies with national spectrum policy."
        )

        approved[region] = {
            "final": float(final_bw),
            "policy_cap": float(max_allowed),
            "status": status,
            "allocation_reason": allocation_reason,
            "policy_reason": policy_reason
        }

    # ---- Second pass: fairness redistribution ----
    finals = [v["final"] for v in approved.values()]
    avg = sum(finals) / len(finals)

    for region in approved:
        if approved[region]["final"] < avg:
            approved[region]["final"] += 0.05 * (avg - approved[region]["final"])

    return approved


def generate_allocation_reason(region, bw, initial_bw):
    if bw > initial_bw:
        return (
            f"{region} received increased spectrum due to higher predicted "
            f"traffic demand, better energy efficiency, and higher priority "
            f"score from socio-economic and network utilization indicators."
        )
    elif bw < initial_bw:
        return (
            f"{region} received reduced spectrum since its predicted traffic "
            f"demand and utilization were lower compared to other regions, "
            f"allowing redistribution for overall network fairness."
        )
    else:
        return (
            f"{region} maintained similar spectrum allocation because its "
            f"network conditions and demand remained stable."
        )


def compute_alpha(congestion_score):
    """
    congestion_score in [0,1]
    returns alpha in [0.1, 0.4]
    """
    return 0.1 + 0.3 * congestion_score
