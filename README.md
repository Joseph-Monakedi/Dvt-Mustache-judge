# The Movember Mustache Judge 🥸
### A DVT Graduate Build — 2026 Movember Initiative

A crowd-delighting, zero-friction AI facial hair judging application built with **React** + **ASP.NET Core 8 Web API**, powered by **Google Gemini 2.0 Flash**, 100% free cloud storage (Cloudinary / Supabase), and an interactive real-time office leaderboard.

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
  └── Real-Time Leaderboard & Kiosk Mode
          │
          ▼ POST /api/mustache/judge
ASP.NET Core 8 Web API
  ├── Cloudinary / Supabase Storage (Free Tier Image CDN)
  ├── Google Gemini 2.0 Flash (Multimodal vision + strict JSON rubric)
  └── EF Core Database (PostgreSQL / SQLite)
```

---

## 🚀 How to Execute with Orca & Agents

This repository is structured into 6 sequential/parallel Work Packages defined in [`ORCA_AGENT_EXECUTION_PLAN.md`](./ORCA_AGENT_EXECUTION_PLAN.md):

1. **Work Package 1**: Backend Infrastructure & Data Layer (`DvtMustacheJudge.Api`, SQLite/Supabase EF Core, Cloudinary storage service)
2. **Work Package 2**: Gemini AI Service (`IGeminiJudgeService` with multimodal vision, system prompt, and JSON response schema)
3. **Work Package 3**: React Frontend Core & Optical Camera HUD (`WebcamBooth.jsx` with SVG face & mustache reticle)
4. **Work Package 4**: Results Presentation & Suspense Reveal (`JudgingModal.jsx`, `VerdictCard.jsx`, shareable PNG canvas scorecard)
5. **Work Package 5**: Live Leaderboard & Office Kiosk Mode (`Leaderboard.jsx` podium, category filters, fullscreen kiosk with QR code)
6. **Work Package 6**: Integration, Testing & Mock Seed Data (15 seed mustaches, endpoint tests, prompt safety checks)

To assign a task in Orca, point the agent to the corresponding Work Package in `ORCA_AGENT_EXECUTION_PLAN.md`.
