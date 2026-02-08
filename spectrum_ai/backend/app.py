from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch

from allocator import run_priority_allocator
from rag_policy import enforce_policy, init_rag

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading MADRL model...")

checkpoint = torch.load("madrl_model.pt")

regions = checkpoint["regions"]
initial = checkpoint["initial_spectrum"].cpu().numpy()
final = checkpoint["final_spectrum"].cpu().numpy()

print("Initializing RAG...")
init_rag()
print("Backend ready.")

@app.get("/run-allocation")
def run_allocation():
    # STEP 1 — Priority allocation
    allocated = run_priority_allocator(regions, initial, final)

    # STEP 2 — Policy enforcement
    alloc_dict = dict(zip(regions, allocated))
    alloc_dict = enforce_policy(alloc_dict)

    # STEP 3 — Response format
    response = {}
    for i, r in enumerate(regions):
        response[r] = {
            "initial": float(initial[i]),
            "final": float(alloc_dict[r]),
            "change": float(alloc_dict[r] - initial[i])
        }

    return response
