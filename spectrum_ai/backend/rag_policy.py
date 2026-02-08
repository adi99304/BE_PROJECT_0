initialized = False

def init_rag():
    global initialized
    if initialized:
        return
    print("Loading policy RAG...")
    # load PDFs, embeddings, FAISS
    initialized = True
    print("RAG ready.")




def enforce_policy(alloc_dict):
    # simplified policy guardian
    CAP = 50

    for r in alloc_dict:
        alloc_dict[r] = min(alloc_dict[r], CAP)

    return alloc_dict
