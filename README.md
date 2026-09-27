# Pookie AI 🎀 - Full-Stack AI Character & Gaming Sanctuary ♡

> A delightful, production-grade AI companion experience integrated into an aesthetic game world featuring dynamic multi-character conversations (powered by OpenAI ChatGPT), natural speech synthesis (powered by ElevenLabs), arcade mini-games, daily vibe checks, Pomodoro study sanctuary, customizable pastel themes, secret diary notes, and full XP gamification!

---

## 🌸 Overview

**Pookie AI** transforms a simple pastel chat mockup into an interactive, full-stack digital companion and arcade application. Designed with heartwarming aesthetics, responsive glassmorphism layouts, procedural Web Audio sound synthesis, voice interaction (STT & ElevenLabs TTS), and a dual-engine AI conversational system:
- **Server-Side OpenAI ChatGPT API**: Secure intelligence layer running on the backend with dynamic system prompts, persistent conversation memory, and game-state awareness.
- **Server-Side ElevenLabs Voice Studio**: High-fidelity text-to-speech with audio caching, rate limiting, and allowed original voice designs.
- **Deep Offline Intelligence Fallback**: Context-aware intent engine with memory (remembers user name), emotional support (5-4-3-2-1 grounding, breathing exercises), math calculator, educational explanations, witty humor, and jokes.

---

## ✨ Upgraded Features & Architecture

### 1. 💬 Modern ChatGPT-Style Conversational Experience
- **OpenAI ChatGPT Layer**: Connects via secure backend endpoint `POST /api/chat`.
- **Scalable Character System (`characters/`)**:
  - 🐰 **Pookie Bestie**: Heartwarming, supportive digital best friend.
  - 🕵️‍♂️ **Detective Sterling**: Astute noir-style mystery investigator.
  - 🍵 **Master Kenji**: Calm Zen mindfulness scholar and focus mentor.
  - 🤖 **Nova Cyber-AI**: High-energy quantum cybernetic AI companion.
  - 🥐 **Chef Marcel**: Passionate European culinary master and comfort guide.
- **ChatGPT UI Enhancements**:
  - Character selector carousel bar with live companion switching.
  - Streaming-style typewriter rendering.
  - Multiline auto-expanding textarea input with Enter to send and Shift+Enter for newlines.
  - Stop generation & playback button.
  - Retry / Regenerate response button.
  - Copy response to clipboard with toast notification.
  - Clear conversation history button per character.
  - Persistent conversation state saved per character.

### 2. 🎙️ ElevenLabs Text-to-Speech Voice System
- **Backend Voice Endpoint**: `POST /api/tts` calls ElevenLabs using server-side credentials only.
- **Voice Caching**: In-memory SHA-256 audio buffer cache eliminates duplicate API calls and latency.
- **Voice Allowlist**:
  - `Rachel` (`21m00Tcm4TlvDq8ikWAM`): Sweet, gentle conversational voice.
  - `Adam` (`pNInz6obpgDQGcFmaJgB`): Deep, investigative narrative male voice.
  - `Antoni` (`ErXwobaYiN019PkySvjV`): Meditative, calm Zen mentor voice.
  - `Bella` (`EXAVITQu4vr4xnSDxMaL`): Bright, expressive sci-fi voice.
  - `Arnold` (`VR6AewLTigWG4xSOukaG`): Rich, theatrical European cadence.
  - `Elli` (`MF3mGyEYCl7XYWbV9V6O`): Youthful, cheerful voice.
  - `Josh` (`TxGEqnHWrfWFTfGW9XjX`): Warm, natural everyday voice.
- **Legal & Safety Standard**: Uses only authorized original voice designs and ElevenLabs Voice Library assets. Unauthorized scraping or celebrity voice cloning is strictly prohibited.
- **Seamless Fallback**: If ElevenLabs API key is not configured or unavailable, automatically falls back to high-fidelity browser speech synthesis without UI freezing.

### 3. 🎮 Game State Integration
The AI characters are fully aware of the player's live game context:
- Current player level & XP
- Bestie streak count
- Current aesthetic color theme & mascot
- Arcade high scores in Pookie Match and Catch The Sparkles
- Study Sanctuary Pomodoro task progress
- Daily vibe check results

Characters actively acknowledge achievements, encourage study goals, and celebrate high scores in their own distinct personality!

### 4. 🔒 Enterprise Security
- **Server-Side Only Secrets**: `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` are read from server environment variables or `.env`.
- **Zero Client Exposure**: No API keys are ever stored in client JavaScript or `localStorage`.
- **Input Validation & Sanitization**: Message length caps (4,000 characters), character ID validation, and voice ID allowlisting.
- **Rate Limiting**: Built-in per-IP rate limiting prevents API abuse.
- **Directory Traversal Protection**: Hardened static file resolution.

---

## 🚀 How to Run

### Local Node.js Server
```powershell
# Inside pookie-ai directory:
agy-node server.js
# Or with standard Node:
node server.js
```
Then visit: 👉 **`http://localhost:3000`**

### Running the Test Suite
```powershell
agy-node test.js
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```ini
# OpenAI ChatGPT API Key
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# ElevenLabs Voice API Key
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Server Configuration
PORT=3000
HOST=0.0.0.0
```

---

## 📂 Project Structure

```text
pookie-ai/
├── index.html          # Main application shell with character carousel & upgraded chat UI
├── package.json        # Project metadata & npm scripts
├── server.js           # Production Node.js HTTP server (/api/chat, /api/tts, /api/characters)
├── test.js             # Comprehensive automated verification suite
├── README.md           # Documentation
├── .env.example        # Environment variables template
├── .gitignore          # Git exclusion rules protecting .env and logs
├── characters/         # Scalable Character Configuration System
│   ├── index.js        # Character loader, registry, and voice allowlist
│   ├── pookie.json     # Pookie Bestie configuration
│   ├── detective.json  # Detective Sterling configuration
│   ├── sensei.json     # Master Kenji configuration
│   ├── cyber_nova.json # Nova Cyber-AI configuration
│   └── chef_marcel.json# Chef Marcel configuration
├── css/
│   └── style.css       # Complete design system, themes, animations & responsive styles
├── js/
│   ├── app.js          # Core app manager, routing, XP leveling, sound synthesizer
│   ├── ai-engine.js    # Multi-character OpenAI ChatGPT client & offline reasoning fallback
│   ├── voice-manager.js# ElevenLabs TTS integration, caching, & browser voice fallback
│   ├── games.js        # Mini-games: Pookie Match, Catch Sparkles canvas, Fortune Bow
│   ├── study.js        # Pomodoro timer, procedural Web Audio ambient sounds, flashcards
│   └── notes.js        # Secret diary, mood stickers, AI reflection & export
└── icons/              # PWA manifest and app icons
```
