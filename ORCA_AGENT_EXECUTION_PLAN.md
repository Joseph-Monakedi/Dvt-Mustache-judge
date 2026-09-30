# The Movember Mustache Judge 🥸
## Multi-Agent / Orca Execution Blueprint & Specification
**Target Audience**: Autonomous AI Agents, Orca Workflows, and Graduate Engineering Squads  
**Stack**: React (Vite) + ASP.NET Core 8 Web API + Google Gemini 2.0 Flash + Cloudinary/Supabase (Free Tier)

---

## 1. System Overview & Invariants

This document is the authoritative implementation plan for autonomous agents (Orca / Antigravity agents). Agents executing tasks must adhere to these non-negotiable boundaries:

1. **Zero Auth / Frictionless Invariant**: No login, JWTs, or passwords. User submits only `Name`, optional `Cohort/Office`, and `Image`.
2. **Free-Tier Invariant ($0.00 Operating Cost)**:
   - AI Vision: Google Gemini 2.0 Flash via Google AI Studio Free Tier (15 RPM, 1,500 RPD).
   - Storage: Cloudinary Free Tier (25GB) or Supabase Storage (1GB).
   - Database: Supabase PostgreSQL (500MB) with local SQLite fallback for offline demo.
3. **Kindness & Safety Invariant**:
   - The AI must roast only the facial hair (density, symmetry, styling, swagger).
   - Zero comments or insults regarding skin tone, weight, age, gender, teeth, or non-mustache facial features.
4. **Camera Optical Guidance**:
   - The React camera component must display an SVG HUD showing an oval face contour and an upper-lip mustache alignment reticle.

---

## 2. Shared Interface Contracts & Data Schemas

### 2.1 Gemini 2.0 Flash Response Schema (JSON Mode)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "overallScore": { "type": "integer", "minimum": 1, "maximum": 100 },
    "mustacheTitle": { "type": "string" },
    "densityScore": { "type": "integer", "minimum": 1, "maximum": 10 },
    "symmetryScore": { "type": "integer", "minimum": 1, "maximum": 10 },
    "swaggerScore": { "type": "integer", "minimum": 1, "maximum": 10 },
    "styleCategory": { "type": "string", "enum": ["Chevron", "Handlebar", "Pencil", "Horseshoe", "Walrus", "Peach Fuzz", "Stubbled Maverick", "Painter's Brush", "Other"] },
    "roast": { "type": "string" },
    "celebrityTwin": { "type": "string" },
    "verdictBadge": { "type": "string" }
  },
  "required": [
    "overallScore",
    "mustacheTitle",
    "densityScore",
    "symmetryScore",
    "swaggerScore",
    "styleCategory",
    "roast",
    "celebrityTwin",
    "verdictBadge"
  ]
}
```

### 2.2 REST API Specification (OpenAPI Subset)

#### `POST /api/mustache/judge`
- **Content-Type**: `multipart/form-data`
- **Request Fields**:
  - `name`: string (required, 2-50 chars)
  - `cohort`: string (optional, e.g. "JHB Graduates", "Cape Town Devs")
  - `image`: binary file (required, JPEG/PNG/WebP, max 8MB)
- **Response**: `200 OK`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "contestantName": "Thabo M.",
  "officeLocation": "JHB Devs",
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1234/stache1.jpg",
  "thumbnailUrl": "https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,w_200,h_200/v1234/stache1.jpg",
  "overallScore": 87,
  "densityScore": 8,
  "symmetryScore": 9,
  "swaggerScore": 9,
  "mustacheTitle": "The Handlebar Inquisitor",
  "styleCategory": "Handlebar",
  "roast": "This mustache has enough curvature to be classified as architectural heritage. Truly formidable bristle discipline.",
  "celebrityTwin": "76% Tom Selleck, 20% Hercule Poirot, 4% Peach Fuzz",
  "verdictBadge": "Certified DVT Heavyweight",
  "createdAt": "2026-10-31T14:30:00Z"
}
```

#### `GET /api/mustache/leaderboard`
- **Query Params**:
  - `limit`: int (default: 50)
  - `category`: string (optional, e.g. "All", "Chevron", "Handlebar")
- **Response**: `200 OK`
```json
{
  "totalEntries": 42,
  "entries": [
    {
      "rank": 1,
      "id": "...",
      "contestantName": "...",
      "thumbnailUrl": "...",
      "overallScore": 94,
      "mustacheTitle": "The Bristle Sovereign",
      "styleCategory": "Chevron",
      "verdictBadge": "Grand Champion",
      "createdAt": "..."
    }
  ]
}
```

#### `GET /api/mustache/entry/{id}`
- **Response**: Full `MustacheEntry` details for individual sharecard view.

---

## 3. Orca / Agent Work Packages (Step-by-Step)

The project is decomposed into 6 independent agent work packages that can be executed sequentially or in parallel.

```
┌────────────────────────────────────────────────────────┐
│           Work Package 1: Backend & Storage             │
│           (ASP.NET Core Web API + DB + Storage)        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│           Work Package 2: Gemini AI Service            │
│       (Prompt Rubric + Multimodal Vision Client)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│           Work Package 3: React Optical Camera HUD     │
│        (Webcam Stream + Canvas Mustache Overlay)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Work Package 4: Results & Suspense Reveal         │
│     (Deliberation Animation + Scorecard + Share)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Work Package 5: Leaderboard & Kiosk Mode          │
│       (Podium + Filterable Table + Big Screen)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      Work Package 6: End-to-End Testing & Mock Seed    │
│      (Contract Tests + Mock Data + Launch Drill)       │
└────────────────────────────────────────────────────────┘
```

---

### Work Package 1: Backend Infrastructure & Data Layer
**Assigned Agent**: Backend / C# Specialist  
**Objectives**:
1. Initialize an ASP.NET Core 8 Web API project (`DvtMustacheJudge.Api`).
2. Implement `MustacheEntry` Entity Framework Core model:
   - Fields: `Id` (Guid), `ContestantName`, `OfficeLocation`, `ImageUrl`, `ThumbnailUrl`, `OverallScore`, `DensityScore`, `SymmetryScore`, `SwaggerScore`, `MustacheTitle`, `StyleCategory`, `RoastCommentary`, `CelebrityTwin`, `VerdictBadge`, `CreatedAt`, `IsHidden`.
3. Configure `AppDbContext` supporting SQLite (for local runs) and PostgreSQL (for Supabase).
4. Implement `IImageStorageService` interface with two implementations:
   - `CloudinaryStorageService`: Uploads image bytes using Cloudinary .NET SDK, returns full URL and face-crop thumbnail URL.
   - `LocalStorageService`: Fallback local disk store for zero-dependency offline runs.
5. Implement CORS policy allowing Vite React dev server (`http://localhost:5173`).

---

### Work Package 2: Gemini AI Service & Prompt Engineering
**Assigned Agent**: GenAI / Integration Specialist  
**Objectives**:
1. Implement `IGeminiJudgeService` in C#.
2. Configure HTTP client or Google Gen AI SDK utilizing `gemini-2.0-flash` (or `gemini-1.5-flash`).
3. Inject the system instruction containing the kindness invariant and rubric.
4. Enforce structured response (`responseMimeType: "application/json"` with schema).
5. Build fallback logic: If Gemini encounters a rate limit (HTTP 429), return a randomized humorous fallback verdict from a local JSON catalogue so the user never gets an error screen.

---

### Work Package 3: React Frontend Core & Optical Camera HUD
**Assigned Agent**: Frontend / UX Specialist  
**Objectives**:
1. Initialize React project with Vite in `client/` using Vanilla CSS and DVT design tokens:
   - Colors: `#070c14` (dark navy), `#007FBA` (DVT blue), `#00b4d8` (cyan), `#f0f4f8` (text).
   - Typography: Google Fonts `Poppins`.
2. Build `WebcamBooth.jsx`:
   - Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`.
   - Renders an SVG optical HUD overlaid on top of the `<video>` element:
     - Dotted oval for face positioning.
     - Bracketed reticle for mustache/upper lip alignment.
     - Interactive guide status: "Move closer", "Align upper lip within the bracket".
3. Implement `captureSnapshot()`:
   - Draws video frame to an off-screen `<canvas>`.
   - Down-samples to max width 1200px, 80% JPEG quality (keeps payload under 500KB).
4. Build fallback drag-and-drop file upload zone for devices without camera access.
5. Form inputs: `Contestant Name` (required) and `Office/Cohort` dropdown.

---

### Work Package 4: Results Presentation & Suspense Reveal
**Assigned Agent**: Frontend / Animation Specialist  
**Objectives**:
1. Build `JudgingModal.jsx` (Suspense Reveal):
   - Plays a 2.5-second humorous animation when the photo is submitted.
   - Cycles through funny status lines:
     - *"Calibrating bristle calipers..."*
     - *"Scanning for marker pen deceit..."*
     - *"Consulting Tom Selleck archives..."*
     - *"Calculating follicle aerodynamic drag..."*
2. Build `VerdictCard.jsx`:
   - Circular SVG score gauge (1-100) with animated fill.
   - Distinct sub-score bars: Density, Symmetry, Bristle Swagger.
   - Mustache Archetype pill badge (e.g., "The Aristocratic Velocity").
   - Celebrity Twin match meter.
   - Roast speech bubble styled like an official judicial declaration.
3. Build `ShareableCanvasCard.jsx`:
   - HTML5 canvas utility that stamps the contestant photo, DVT logo, overall score, and roast into an exportable image (`DVT-Mustache-Verdict.png`) for Slack/Teams.

---

### Work Package 5: Live Leaderboard & Office Kiosk Mode
**Assigned Agent**: Frontend / Real-Time Specialist  
**Objectives**:
1. Build `Leaderboard.jsx`:
   - Top 3 Podium Cards (1st Gold, 2nd Silver, 3rd Bronze) with profile photos, scores, and badges.
   - Filter tabs: "All Staches", "Top Rated", "Wildest Roasts", "Recent Submissions".
   - Search/filter by contestant name.
   - Auto-polling hook fetching `GET /api/mustache/leaderboard` every 10 seconds.
2. Build `KioskMode.jsx`:
   - Fullscreen TV presentation mode with dark DVT theme.
   - Displays live QR code on the side linking to the mobile submission URL.
   - Auto-rotates recent submissions across the office screen.

---

### Work Package 6: Integration, Testing & Launch Verification
**Assigned Agent**: QA & DevOps Specialist  
**Objectives**:
1. Build a mock dataset of 15 sample mustache entries with diverse scores and archetypes so the leaderboard looks vibrant on first boot.
2. Write integration tests for `.NET` API endpoints (`POST /api/mustache/judge`, `GET /api/mustache/leaderboard`).
3. Run prompt safety validation tests: Ensure no forbidden words or non-facial commentary leak into Gemini outputs.
4. Verify responsiveness across iPhone Safari, Android Chrome, and 1080p/4K office TV displays.

---

## 4. Environment Configuration Template

Create an `.env` (or `appsettings.json`) file with these variables:

```bash
# ASP.NET Core Backend (appsettings.json)
{
  "Gemini": {
    "ApiKey": "YOUR_GOOGLE_AI_STUDIO_API_KEY",
    "Model": "gemini-2.0-flash"
  },
  "Cloudinary": {
    "CloudName": "YOUR_CLOUDINARY_CLOUD_NAME",
    "ApiKey": "YOUR_CLOUDINARY_API_KEY",
    "ApiSecret": "YOUR_CLOUDINARY_API_SECRET"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=mustache_judge.db" # or Supabase Postgres connection string
  }
}

# React Client (.env)
VITE_API_BASE_URL="http://localhost:5000/api"
```

---

## 5. Summary of Artifacts Generated

1. **DVT Intent-Driven Architecture Interactive Presentation**:
   - Location: `IDA-DVT-Mustache-Judge.html`
   - Fully interactive HTML presentation in DVT house style (Poppins, `#007FBA`, Dark/Light mode, Section navigation).
2. **Technical Architecture Plan**:
   - Location: `mustache_judge_architecture_plan.md`
3. **Orca / Multi-Agent Execution Blueprint**:
   - Location: `ORCA_AGENT_EXECUTION_PLAN.md` (this document)
