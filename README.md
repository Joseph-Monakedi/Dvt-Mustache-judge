# The Movember Mustache Judge
### A DVT Graduate Build — 2026 Movember Initiative

A crowd-delighting, zero-friction AI facial hair judging application built with **React** + **ASP.NET Core Web API**, powered by **Google Gemini 3.5 Flash-Lite**, 100% free cloud storage (Cloudinary / Supabase), and an interactive real-time office leaderboard.

---

## 📋 Project Documentation & Blueprints

- **Orca / Multi-Agent Execution Blueprint**: [`ORCA_AGENT_EXECUTION_PLAN.md`](./ORCA_AGENT_EXECUTION_PLAN.md)
  *(Detailed JSON schemas, OpenAPI specifications, and 6 independent agent work packages)*
- **DVT Intent-Driven Architecture (IDA) Presentation**: [`IDA-DVT-Mustache-Judge.html`](./IDA-DVT-Mustache-Judge.html)
  *(Interactive DVT house-style architecture document with dark/light mode toggle and section walkthroughs)*

---

## 🏗️ Architecture at a Glance

```
React Frontend (Vite)
  ├── Optical Camera HUD (SVG face oval + mustache reticle)
  ├── Frictionless Submission (Name only, no login)
  ├── Suspense Reveal Animation
  ├── Real-Time Leaderboard & Kiosk Mode
  └── Protected Admin Portal (Moderation & Deletion)
          │
          ▼ POST /api/mustache/judge
ASP.NET Core Web API
  ├── Cloudinary Storage (Free Tier Image CDN + Local Fallback)
  ├── Google Gemini 3.5 Flash-Lite (Multimodal vision + strict JSON rubric)
  ├── API Rate Limiter (Max 3 req/min for Gemini Free Tier)
  └── EF Core Database (Exclusively Supabase PostgreSQL — No Local Alternative)
```

---

## 🚀 Work Packages Implementation

All 6 Work Packages from [`ORCA_AGENT_EXECUTION_PLAN.md`](./ORCA_AGENT_EXECUTION_PLAN.md) have been implemented and verified:

1. **Work Package 1: Backend Infrastructure & Data Layer**
   - ASP.NET Core Web API (`DvtMustacheJudge.Api`)
   - EF Core `MustacheEntry` model & `AppDbContext` exclusively using Supabase PostgreSQL (`Npgsql`)
   - `LocalStorageService` and `CloudinaryStorageService` with fallback mechanism
   - Strictly 12 official DVT office locations (Johannesburg, Cape Town, Durban, Gqeberha, London, Waterford, Amsterdam, Baar, Nairobi, Dubai, West Perth, REMOTE)
2. **Work Package 2: Gemini AI Service & Prompt Engineering**
   - `IGeminiJudgeService` and `GeminiJudgeService` calling Google Gemini 3.5 Flash-Lite
   - Multimodal image and prompt evaluation with JSON schema enforcement
   - Free tier sliding window rate limiter (max 3 req/min)
   - Strict penalties (scores 5–35) and humorous roasts for clean-shaven contestants
   - Safety invariant: Zero body/skin commentary, facial hair only
   - Offline fallback catalog with diverse archetypes
3. **Work Package 3: React Frontend Core & Optical Camera HUD**
   - Vite React client in `client/`
   - DVT design tokens (`#070c14`, `#007FBA`, `#00b4d8`, `#f0f4f8`, Poppins)
   - `react-icons` for modern UI aesthetics
   - Optical Camera HUD with SVG face contour oval and mustache reticle
   - Canvas snapshot capture (max 1200px, 80% JPEG) and drag-and-drop fallback
4. **Work Package 4: Results Presentation & Suspense Reveal**
   - `JudgingModal.jsx` with 2.5-second suspense animation and humorous status lines
   - `VerdictCard.jsx` with animated SVG score gauge, sub-score bars, celebrity DNA, and roast bubble
   - `ShareableCanvasCard.jsx` generating 16:9 shareable PNG verdict cards for Slack/Teams
5. **Work Package 5: Live Leaderboard & Office Kiosk Mode**
   - `Leaderboard.jsx` with Top 3 Podium (Gold, Silver, Bronze), category filters, and 10s auto-polling
   - `KioskMode.jsx` fullscreen office TV mode with live mobile QR code and rotating submissions
6. **Work Package 6: Integration, Testing & Verification**
   - 15 diverse mock mustache entries pre-seeded with custom SVG avatars
   - Automated integration & prompt safety tests in `DvtMustacheJudge.Tests` (100% passing)

---

## 🏃 Quick Start & How to Run

### 1. Run the ASP.NET Core Web API (Port 5000)

```bash
dotnet run --project DvtMustacheJudge.Api
```

The database (`mustache_judge.db`) will automatically initialize and seed the 15 mock contestants.

### 2. Run the React Vite Client (Port 5173)

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run the Automated Test Suite

```bash
dotnet test
```
