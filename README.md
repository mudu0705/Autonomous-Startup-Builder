# Autonomous Startup Builder

Autonomous Multi-Agent Startup Evaluation & Blueprint Generation Platform powered by Local Ollama AI, Cloud Gemini, and Grounded Research.

---

## 1. System Requirements

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI
- **Ollama**: Local Ollama runtime (for 100% offline local AI mode)

---

## 2. Install & Configure Ollama (Local Offline AI)

Ollama must be installed separately on your machine:

1. Download and install Ollama from [https://ollama.com](https://ollama.com).
2. Download the default model (`qwen2.5-coder:7b`):
   ```bash
   ollama pull qwen2.5-coder:7b
   ```
3. Start the Ollama local background service:
   ```bash
   ollama serve
   ```
   *(By default, Ollama listens on `http://127.0.0.1:11434`)*

---

## 3. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Edit `.env` to configure your preferred AI provider and services:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret
MONGODB_URI=mongodb://localhost:27017/autonomous-startup-builder
APP_URL=http://localhost:3000

# AI Provider Configuration ('auto' | 'ollama' | 'gemini')
AI_PROVIDER=auto

# Local Ollama Provider (Offline Capable - No API key required)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_TIMEOUT_MS=120000

# Cloud Gemini Provider (Optional / Fallback)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash

# Live Web Research Grounding (Optional - Google Custom Search API)
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_CX=

# Public Open-Source Research (Optional - GitHub REST API)
GITHUB_TOKEN=
```

### AI Provider Modes:
- **`auto` (Recommended)**: Prioritizes local **Ollama** first. If Ollama is offline or uninstalled, automatically falls back to **Gemini** (if API key is provided), and finally to the deterministic venture calculation engine.
- **`ollama`**: Strictly uses local Ollama. Does not switch to cloud Gemini. Allows complete offline startup analysis.
- **`gemini`**: Uses Google Gemini cloud API.

---

## 4. Run the Project

### Install dependencies:
```bash
npm install
```

### Run TypeScript & lint verification:
```bash
npm run lint
```

### Run the test suite:
```bash
npm test
```

### Build for production:
```bash
npm run build
```

### Start the development server (Frontend + Backend on one port):
```bash
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

---

## 5. Multi-Agent Pipeline Architecture

```text
USER STARTUP IDEA
       ↓
SMART GUIDED INTAKE (9 Conversational Categories)
       ↓
PIPELINE ORCHESTRATOR
       ↓
9 SPECIALIZED AGENTS:
  1. Idea & Problem Agent
  2. Market Research Agent (with Live Web & Grounding)
  3. Competitor Analysis Agent (with Gap Matrix & GitHub Open-Source)
  4. Customer & Validation Agent (Personas & Hypotheses)
  5. Business Model Agent (Unit Economics & Monetization)
  6. Finance & Budget Agent (Deterministic 24-Mo Engine)
  7. MVP / Product Agent (6-Week Sprints & Tech Stack)
  8. Risk & Feasibility Agent (5-Axis Risk Matrix)
  9. Strategy Agent (Synthesis & 30/60/90 Day Roadmap)
       ↓
INVESTMENT READINESS SCORING (0–100 Weighted Framework)
       ↓
EXECUTIVE DASHBOARD & FULL EXPORT BLUEPRINT
```

---

## 6. AI Health & Status API

Inspect current provider status at:
```
GET /api/health/ai
```
Sample response:
```json
{
  "ollama": {
    "available": true,
    "model": "qwen2.5-coder:7b"
  },
  "gemini": {
    "available": false
  },
  "research": {
    "available": false
  },
  "activeProvider": "ollama",
  "configuredMode": "auto"
}
```