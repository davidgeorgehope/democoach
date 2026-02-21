import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "data/reframe.db")
    AGENT_LLM: str = "gemini-2.0-flash-001"
    AGENT_TEMPERATURE: float = 0.8
    TTS_MODEL: str = "eleven_turbo_v2_5"
    DEFAULT_CUSTOMER_VOICE: str = "JBFqnCBsd6RMkjVDRZzb"  # George
    DEFAULT_PANELIST_VOICE: str = "IKne3meq5aSn9XLyUdCD"  # Charlie


settings = Settings()
