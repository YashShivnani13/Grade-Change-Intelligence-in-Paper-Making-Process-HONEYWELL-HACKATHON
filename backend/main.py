# =============================================================================
# main.py — FastAPI application entry point
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ── Core imports ──────────────────────────────────────────────────────────────
from core.database import count_transitions, init_db
from core.intelligence import AdvisoryEngine
from core.seeder import seed_database
from core.simulator import Simulator
from api.routes_advisory import router as advisory_router
from api.routes_simulator import router as simulator_router
from api.websocket import broadcast_loop, websocket_endpoint


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Grade Change Intelligence System...")
    init_db()

    if count_transitions() == 0:
        logger.info("Empty database detected — running seeder...")
        n = seed_database()
        logger.info("Seeder complete: %d transitions loaded.", n)
    else:
        logger.info("Database already seeded (%d transitions).", count_transitions())

    app.state.simulator = Simulator(starting_grade="A")
    app.state.advisory_engine = AdvisoryEngine()

    # Start background broadcast loop
    broadcast_task = asyncio.create_task(broadcast_loop(app.state))
    logger.info("GCI System ready. Broadcasting on ws://0.0.0.0:8000/ws")

    yield

    # Shutdown
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass
    logger.info("GCI System shutdown complete.")


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Grade Change Intelligence System",
    description="APC advisory layer for paper machine grade transitions — Honeywell Hackathon",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulator_router)
app.include_router(advisory_router)


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket, app.state)


@app.get("/health")
async def health():
    return {"status": "operational", "system": "Grade Change Intelligence System"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
