import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GOOGLE_AI_API_KEY: str = os.getenv("GOOGLE_AI_API_KEY", "")
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "data/reframe.db")
    DEFAULT_LLM: str = "gemini-2.0-flash-001"
    AGENT_TEMPERATURE: float = 0.8
    TTS_MODEL: str = "eleven_turbo_v2_5"
    DEFAULT_CUSTOMER_VOICE: str = "JBFqnCBsd6RMkjVDRZzb"  # George
    DEFAULT_PANELIST_VOICE: str = "IKne3meq5aSn9XLyUdCD"  # Charlie

    # ElevenLabs supported LLM models (brain)
    SUPPORTED_LLMS: list = [
        {"id": "gemini-2.5-flash-preview-04-17", "name": "Gemini 2.5 Flash", "provider": "Google"},
        {"id": "gemini-2.0-flash-001", "name": "Gemini 2.0 Flash", "provider": "Google"},
        {"id": "gemini-2.0-flash-lite-001", "name": "Gemini 2.0 Flash Lite", "provider": "Google"},
        {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "provider": "Google"},
        {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "Google"},
        {"id": "claude-3-7-sonnet", "name": "Claude 3.7 Sonnet", "provider": "Anthropic"},
        {"id": "claude-3-5-sonnet-v2", "name": "Claude 3.5 Sonnet v2", "provider": "Anthropic"},
        {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic"},
        {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "provider": "Anthropic"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI"},
        {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
    ]

    # ElevenLabs TTS models (voice) - English agents only support turbo/flash v2
    SUPPORTED_TTS: list = [
        {"id": "eleven_turbo_v2_5", "name": "Turbo v2.5", "description": "Best quality, low latency"},
        {"id": "eleven_flash_v2_5", "name": "Flash v2.5", "description": "Fastest, lowest latency"},
        {"id": "eleven_turbo_v2", "name": "Turbo v2", "description": "Good quality, low latency"},
        {"id": "eleven_flash_v2", "name": "Flash v2", "description": "Fast, very low latency"},
    ]


settings = Settings()
