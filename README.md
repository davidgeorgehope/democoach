# Demo Coach

AI-powered sales demo coaching platform. Practice realistic customer conversations with voice-driven AI personas, get objections thrown at you, and receive detailed coaching reports on your performance.

## What It Does

- **Voice training sessions** with AI personas that simulate buyers, skeptics, and SE panelists
- **20+ pre-built personas** across industries, each with distinct personalities and objection styles
- **Auto-research** pulls live company and competitive intelligence via Google Search when you select a persona
- **Objection injection** surfaces realistic pushback during sessions, categorized by type and difficulty
- **AI coaching reports** score your sessions across 6 dimensions (objection handling, technical accuracy, storytelling, confidence, discovery, recovery) with transcript-grounded feedback
- **Session comparison** to track improvement over time
- **Knowledge base** upload product docs to ground evaluations against your actual material

## Tech Stack

**Frontend**: React 19, Vite, Tailwind CSS, ElevenLabs React SDK

**Backend**: FastAPI, SQLite, Python

**AI/Voice**: ElevenLabs (voice agent + TTS), OpenAI Realtime (low-latency alternative), Gemini (default LLM + grounded search), Claude (coaching reports)

## Prerequisites

- Python 3.10+
- Node.js 18+
- API keys for the services you want to use

## Setup

1. Clone the repo and create a `.env` file in `backend/`:

```
ELEVENLABS_API_KEY=your-key       # Required - voice conversations
ANTHROPIC_API_KEY=your-key        # Required - coaching reports
GOOGLE_AI_API_KEY=your-key        # Optional - research & Gemini LLM
OPENAI_API_KEY=your-key           # Optional - OpenAI Realtime provider
```

2. Install dependencies and start:

```bash
./run.sh install   # creates venv, installs pip + npm deps
./run.sh start     # starts backend (8000) + frontend (5173)
```

3. Open http://localhost:5173

## Usage

```bash
./run.sh start     # start both services
./run.sh stop      # stop both services
./run.sh restart   # restart
./run.sh status    # check what's running
./run.sh logs      # tail logs
```

### Manual Start

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

## Project Structure

```
backend/
  main.py              # FastAPI app, router registration
  config.py            # API keys, model configs
  db.py                # SQLite init, migrations, seed data
  models.py            # Pydantic request/response models
  prompts/             # System prompt templates (customer, panelist, evaluation)
  routers/             # API endpoints (agent, personas, sessions, research, etc.)
  services/            # Business logic (evaluation, prompts, research, realtime)

frontend/
  src/
    pages/             # Dashboard, Train, Sessions, SessionReview, Personas, etc.
    components/        # VoiceSession, LiveTranscript, CoachingIndicators, etc.
    api.js             # API client
    App.jsx            # Router
```

## How It Works

1. **Pick a persona** -- select a buyer or panelist profile. Auto-research kicks in if the persona has company info.
2. **Set demo context** -- describe what you're demoing and any specific areas to focus on.
3. **Start a voice session** -- the AI persona engages you in a realistic conversation, asking questions and raising objections based on its personality and the injected research.
4. **Mark key moments** -- flag interesting exchanges during the session for later review.
5. **Get your coaching report** -- after ending the session, trigger an AI evaluation that scores your performance with specific transcript examples and improvement suggestions.
6. **Track progress** -- compare sessions over time to see how your scores trend across categories.
