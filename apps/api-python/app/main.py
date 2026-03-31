"""
Oshxona POS Backend — FastAPI + SQLite
"""
import os
import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .models import *  # noqa: F401,F403
from .routes import (
    pos_users, pos_orders, pos_tables, pos_customers,
    pos_analytics, pos_inventory, pos_finance, pos_staff,
    pos_notifications, pos_delivery, pos_reservations,
    pos_loyalty, pos_webhooks,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CORS_ORIGINS = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:80,http://localhost,http://127.0.0.1"
    ).split(",") if o.strip()
]

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Oshxona POS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(pos_users.router, prefix="/api")
app.include_router(pos_orders.router, prefix="/api")
app.include_router(pos_tables.router, prefix="/api")
app.include_router(pos_customers.router, prefix="/api")
app.include_router(pos_analytics.router, prefix="/api")
app.include_router(pos_inventory.router, prefix="/api")
app.include_router(pos_finance.router, prefix="/api")
app.include_router(pos_staff.router, prefix="/api")
app.include_router(pos_notifications.router, prefix="/api")
app.include_router(pos_delivery.router, prefix="/api")
app.include_router(pos_reservations.router, prefix="/api")
app.include_router(pos_loyalty.router, prefix="/api")
app.include_router(pos_webhooks.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "oshxona-pos"}


@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/api/health")
def api_health():
    return {"status": "healthy", "timestamp": time.time()}
