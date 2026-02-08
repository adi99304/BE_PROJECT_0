from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch

from rag_policy import init_rag

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

# Build allocation dictionary
alloc_dict = {}
for i, r in enumerate(regions):
    alloc_dict[r] = {
        "initial": float(initial[i]),
        "final": float(final[i]),
        "change": float(final[i] - initial[i])
    }

print("Initializing RAG...")
init_rag()
print("Backend ready.")

@app.get("/run-allocation")
def run_allocation():
    return alloc_dict
