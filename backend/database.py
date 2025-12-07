import aiosqlite
import json
from typing import Optional, List, Dict, Any
from datetime import datetime

DATABASE_PATH = "ai_judge.db"


async def init_db():
    """Initialize database with required tables."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Submissions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                queue_id TEXT NOT NULL,
                labeling_task_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                raw_data TEXT NOT NULL
            )
        """)
        
        # Questions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id TEXT NOT NULL,
                question_template_id TEXT NOT NULL,
                question_type TEXT NOT NULL,
                question_text TEXT NOT NULL,
                rev INTEGER NOT NULL,
                FOREIGN KEY (submission_id) REFERENCES submissions(id)
            )
        """)
        
        # Answers table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id TEXT NOT NULL,
                question_template_id TEXT NOT NULL,
                choice TEXT NOT NULL,
                reasoning TEXT,
                FOREIGN KEY (submission_id) REFERENCES submissions(id)
            )
        """)
        
        # Judges table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS judges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                system_prompt TEXT NOT NULL,
                model_name TEXT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        
        # Judge assignments table (many-to-many: judges <-> questions in queue)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS judge_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                queue_id TEXT NOT NULL,
                question_template_id TEXT NOT NULL,
                judge_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (judge_id) REFERENCES judges(id),
                UNIQUE(queue_id, question_template_id, judge_id)
            )
        """)
        
        # Evaluations table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id TEXT NOT NULL,
                question_template_id TEXT NOT NULL,
                judge_id INTEGER NOT NULL,
                verdict TEXT NOT NULL,
                reasoning TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (submission_id) REFERENCES submissions(id),
                FOREIGN KEY (judge_id) REFERENCES judges(id)
            )
        """)
        
        await db.commit()


async def get_db():
    """Get database connection."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    return db

