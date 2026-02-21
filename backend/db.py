import sqlite3
import os
from pathlib import Path
from config import settings


def get_db_path():
    return settings.DATABASE_PATH


def get_connection():
    db_path = get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'customer',
            system_prompt TEXT NOT NULL,
            voice_id TEXT NOT NULL,
            voice_name TEXT,
            avatar_color TEXT DEFAULT '#F46800',
            is_default BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS objections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER REFERENCES personas(id) ON DELETE SET NULL,
            trigger_context TEXT,
            objection_text TEXT NOT NULL,
            category TEXT NOT NULL,
            source TEXT,
            difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
            times_used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transcripts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            source_file TEXT,
            content TEXT NOT NULL,
            objections_extracted BOOLEAN DEFAULT 0,
            imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER REFERENCES personas(id),
            demo_context TEXT,
            status TEXT DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            duration_seconds INTEGER,
            elevenlabs_conversation_id TEXT,
            transcript_json TEXT,
            overall_rating INTEGER,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS session_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            timestamp_seconds INTEGER,
            agent_text TEXT,
            user_text TEXT,
            rating INTEGER,
            notes TEXT
        );
    """)

    conn.commit()
    conn.close()


def seed_data():
    """Seed default personas and objections on first run."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM personas")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # Load prompts
    prompts_dir = Path(__file__).parent / "prompts"
    customer_prompt = (prompts_dir / "customer.txt").read_text()
    panelist_prompt = (prompts_dir / "panelist.txt").read_text()

    # Seed personas
    cursor.execute("""
        INSERT INTO personas (name, description, type, system_prompt, voice_id, voice_name, avatar_color, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("Andrew", "Director of Operations at a Fortune 500 company evaluating observability platforms",
          "customer", customer_prompt, settings.DEFAULT_CUSTOMER_VOICE, "George", "#F46800", 1))
    customer_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO personas (name, description, type, system_prompt, voice_id, voice_name, avatar_color, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("Panel SE", "Senior Advisory SE on a panel interview",
          "panelist", panelist_prompt, settings.DEFAULT_PANELIST_VOICE, "Charlie", "#3B82F6", 1))
    panelist_id = cursor.lastrowid

    # Seed customer objections
    customer_objections = [
        ("Datadog gives me all of this in one platform. Why add complexity?", "Cost/platform discussion", "competitive", 3),
        ("Show me the service map. I want to see my services and dependencies.", "During any demo section", "competitive", 4),
        ("Dynatrace does this automatically with Davis. What's different?", "AI/automation discussion", "competitive", 4),
        ("I'm not looking at a logs index. I'm looking at a service.", "During log-based demo", "technical_depth", 5),
        ("How do you do cross-service correlation? Needle in a haystack.", "Discovery/investigation", "technical_depth", 4),
        ("We're invested in traces and OTel. Are you saying that's wasted?", "Open standards discussion", "commercial", 3),
        ("Can you show me how this works with our Kafka pipeline?", "Mid-demo", "scope_creep", 2),
        ("What about security monitoring? Can we consolidate?", "Near end of demo", "scope_creep", 2),
    ]
    for text, context, category, difficulty in customer_objections:
        cursor.execute("""
            INSERT INTO objections (persona_id, objection_text, trigger_context, category, source, difficulty)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (customer_id, text, context, category, "seed", difficulty))

    # Seed panelist objections
    panelist_objections = [
        ("You've been in marketing for three years. Can you still sell?", "Early in demo", "credibility", 4),
        ("You're from a competitor. How deep are you on our stack?", "Early in demo", "credibility", 4),
        ("How would you handle a customer who's happy with Datadog?", "Any time", "competitive", 4),
        ("Trash your current employer for us.", "Mid-demo", "competitive", 5),
        ("Beyla/eBPF -- isn't that immature for production?", "During Beyla section", "technical_depth", 3),
        ("Cool AI demo, but customers aren't buying AI yet.", "After AI section", "commercial", 3),
        ("If this demo broke right now, what would you do?", "Random", "recovery", 4),
        ("How would you coach a junior SE to handle what you just showed?", "After any section", "coaching", 3),
    ]
    for text, context, category, difficulty in panelist_objections:
        cursor.execute("""
            INSERT INTO objections (persona_id, objection_text, trigger_context, category, source, difficulty)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (panelist_id, text, context, category, "seed", difficulty))

    conn.commit()
    conn.close()


def get_config(key: str) -> str | None:
    conn = get_connection()
    row = conn.execute("SELECT value FROM config WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else None


def set_config(key: str, value: str):
    conn = get_connection()
    conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()
