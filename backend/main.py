import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import get_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/stock")
def get_stock():
    """Return the stock listing required by Section 4.3 of the build guide.

    Performs a database join between stock and items to provide:
    item_id, name, quantity, unit.
    Returns an empty list if tables or records do not exist.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT s.item_id, i.name, s.quantity, i.unit
                FROM stock s
                JOIN items i ON s.item_id = i.id
                ORDER BY s.item_id
                """
            )
            rows = cursor.fetchall()
            return [
                {
                    "item_id": row["item_id"],
                    "name": row["name"],
                    "quantity": row["quantity"],
                    "unit": row["unit"],
                }
                for row in rows
            ]
    except sqlite3.OperationalError:
        return []
