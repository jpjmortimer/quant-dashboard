import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Research Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Domain model ----

class Candle(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class ComputeRequest(BaseModel):
    candles: List[Candle]


class ComputeResponse(BaseModel):
    count: int
    last_close: float
    average_close: float


# ---- Core endpoint ----

@app.post("/compute", response_model=ComputeResponse)
def compute(req: ComputeRequest):
    closes = [c.close for c in req.candles]

    return ComputeResponse(
        count=len(closes),
        last_close=closes[-1],
        average_close=sum(closes) / len(cles := closes),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


VERSION = os.getenv("SERVICE_VERSION", "dev")
START_TIME = time.time()

@app.get("/meta")
def meta():
    return {
        "service": "research-service",
        "status": "ok",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "version": VERSION,
    }
