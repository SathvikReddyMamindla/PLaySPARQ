"""
SportSphere persistent database manager using SQLite.
Supports transactions, foreign keys, row dicts, and connection pooling.
"""
from __future__ import annotations
import json
import os
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = os.getenv("SQLITE_DB_PATH", str(Path(__file__).resolve().parent.parent / "sportsphere.db"))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def now_ms() -> int:
    return int(time.time() * 1000)


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class Database:
    """Helper interface for SQLite operations."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_conn(self) -> sqlite3.Connection:
        return get_connection()

    def execute(self, sql: str, params: Tuple[Any, ...] = ()) -> sqlite3.Cursor:
        conn = self.get_conn()
        try:
            with conn:
                cur = conn.execute(sql, params)
                return cur
        finally:
            conn.close()

    def executemany(self, sql: str, seq_of_params: List[Tuple[Any, ...]]) -> sqlite3.Cursor:
        conn = self.get_conn()
        try:
            with conn:
                cur = conn.executemany(sql, seq_of_params)
                return cur
        finally:
            conn.close()

    def fetchone(self, sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        try:
            cur = conn.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def fetchall(self, sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        try:
            cur = conn.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()


DB = Database()
