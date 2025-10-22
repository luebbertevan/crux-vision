# CruxVision MVP - Specification

## Overview

**Goal:** Build a minimal, testable AI climbing coach that analyzes a short climbing video and returns actionable, human-readable feedback.

**Core Deliverables (MVP):**

-   Select a climbing video file (≤60s recommended for processing speed)
-   Backend runs pose estimation (MediaPipe + OpenCV) and computes simple metrics
-   Backend returns structured JSON metrics and coaching feedback
-   Optional: annotated overlay video (skeleton + flags)

**Audience & Constraints:**

-   Demo-focused: local files only, no cloud storage or authentication for MVP
-   Prioritize deterministic heuristics.
-   Timeboxed: aim for a small MVP; keep milestones small and testable

## Tech Stack

-   **Frontend:** React + TypeScript + Vite + Tailwind
-   **Backend:** Python 3.9+ + FastAPI (Note: Using Python 3.9.6 due to system availability)
-   **Pose estimation:** MediaPipe (Python)
-   **Video processing:** OpenCV (opencv-python-headless)
-   **Storage:** local filesystem (backend/static/uploads, backend/static/outputs)
-   **Video formats:** MP4, MOV, AVI (common formats)
-   **File size limit:** 50MB max upload
-   **Processing:** Async background tasks (FastAPI BackgroundTasks)

## Project Structure

```
crux-vision/
  frontend/
    package.json
    vite.config.ts
    index.html
    src/
      main.tsx
      App.tsx
      routes/
        index.tsx
      pages/
        UploadPage.tsx
        ResultsPage.tsx
      components/
        Header.tsx
        FileUpload.tsx
        VideoPreview.tsx
        FeedbackCard.tsx
      styles/
        tailwind.css
  backend/
    README.md
    requirements.txt
    main.py                # FastAPI entrypoint
    src/
      api/
        routes.py            # /api/analyze, /api/results, /api/ping
      pipeline/
        input.py             # Load & validate video
        process.py           # MediaPipe + OpenCV wrapper
        analysis.py          # Heuristics and metrics
        output.py            # Annotated overlay renderer (optional)
      models/
        schema.py            # Pydantic models
      utils/
        file_utils.py        # File validation & cleanup
    static/
      uploads/
      outputs/
  README.md
  LICENSE
  spec.md
```

## API Contract

### POST /api/analyze

-   **Request:** multipart/form-data { file: video }
-   **Response (202 Accepted):**
    ```json
    {
    	"id": "<uuid>",
    	"status_url": "/api/results/<id>"
    }
    ```
-   **Response (400 Bad Request):**
    ```json
    {
    	"error": "Invalid file format or size too large"
    }
    ```

### GET /api/results/:id

-   **Response (200):**
    ```json
    {
      "id": "<uuid>",
      "status": "processing" | "complete" | "error",
      "created_at": "ISO timestamp",
      "metrics": {
        "avg_hip_angle": number | null,
        "avg_knee_angle": number | null,
        "stability_score": number | null
      } | null,
      "feedback": ["string", ...] | null,
      "video_url": "/static/outputs/output_<id>.mp4" | null,
      "error_message": string | null
    }
    ```
-   **Response (404 Not Found):**
    ```json
    {
    	"error": "Analysis not found"
    }
    ```

### GET /api/ping

-   **Healthcheck.** Returns `{"message": "pong"}`

## Pydantic Models

**backend/src/models/schema.py**

```python
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

class AnalyzeResponse(BaseModel):
    id: str
    status_url: str

class ErrorResponse(BaseModel):
    error: str

class ResultMetrics(BaseModel):
    avg_hip_angle: Optional[float] = None
    avg_knee_angle: Optional[float] = None
    stability_score: Optional[float] = None

class Result(BaseModel):
    id: str
    status: Literal["processing", "complete", "error"]
    created_at: str
    metrics: Optional[ResultMetrics] = None
    feedback: Optional[List[str]] = None
    video_url: Optional[str] = None
    error_message: Optional[str] = None
```

## Milestones

Each milestone is intentionally small and testable. M3 has been broken down into sub-parts (M3a, M3b, M3c) for safer testing and debugging.

### ✅ M0 — Specification (done)

-   **Purpose:** Agree spec, milestones, file structure
-   **Acceptance:** This `spec.md` reviewed & approved

### ✅ M1 — Backend bootstrap (FastAPI + ping)

-   **Files:** `backend/main.py`, `backend/src/api/routes.py`, `requirements.txt`
-   **Acceptance:** `uvicorn backend.main:app --reload` serves `/api/ping` -> `{message: 'pong'}`
-   **Test:** curl GET localhost:8000/api/ping

### ✅ M2 — File upload endpoint & storage

-   **Files:** `backend/src/api/routes.py`, `backend/src/pipeline/input.py`, `backend/src/utils/file_utils.py`
-   **Acceptance:** `POST /api/analyze` accepts video files via multipart form, validates format/size, stores in `static/uploads/`, returns 202 with id
-   **Test:** curl POST with valid/invalid files; proper error handling for large/invalid files

### M3 — Pose extraction

## M3a — Basic video processing (OpenCV)

-   **Files:** `backend/src/pipeline/process.py`
-   **Acceptance:** Reads uploaded video, extracts frames (N=3 sampling), basic error handling
-   **Test:** Can read frames from uploaded video, verify frame sampling works
-   **Dependencies:** OpenCV only (no MediaPipe yet)

## M3b — MediaPipe integration

-   **Files:** `backend/src/pipeline/process.py` (add MediaPipe)
-   **Acceptance:** Runs MediaPipe Pose on sampled frames, detects keypoints
-   **Test:** Verify pose detection works on sample frames
-   **Dependencies:** OpenCV + MediaPipe

## M3c — JSON output & integration

-   **Files:** `backend/src/pipeline/process.py` (add JSON output), `backend/src/api/routes.py` (integration)
-   **Acceptance:** Saves keypoints to JSON, integrates with upload flow
-   **Test:** Full end-to-end processing: upload → pose detection → JSON output
-   **Performance:** ~50-75 seconds processing time for 60-second video

### M4 — Heuristic analysis & feedback

-   **Files:** `backend/src/pipeline/analysis.py`
-   **Acceptance:** Compute average joint angles and a stability score, produce 2–5 human-readable feedback items
-   **Test:** `GET /api/results/:id` shows metrics and feedback

### M5 — Optional overlay renderer (defer if timeboxed)

-   **Files:** `backend/src/pipeline/output.py`
-   **Acceptance:** Produce `static/outputs/output_<id>.mp4` with skeleton overlay and simple flags
-   **Test:** Play the output video locally; overlays align with motion

### M6 — Frontend minimal UI

-   **Files:** `frontend/src/pages/*`, `frontend/src/components/*`
-   **Acceptance:** Dev server runs (`bun run dev`), user can select video file via standard file input, see processing state, and view results page
-   **Test:** Full end-to-end file selection -> processing -> results locally

### M7 — Small polish & docs

-   Add README quick start, comment code, and pin dependency versions

## Heuristics & Rules

These are simple, explainable rules good for MVP. Implement in `analysis.py` using MediaPipe keypoints.

-   **Joint angles:** compute angle between three keypoints (e.g., shoulder-elbow-wrist for elbow angle) per frame. Report mean and standard deviation.
-   **Stability score:** compute centroid of selected keypoints per frame; calculate variance over time. Higher variance -> lower stability score.
-   **Hip proximity:** using shoulder-hip-ankle alignment to estimate torso lean; large forward/backward deviation -> feedback about hips.
-   **Reach inefficiency:** detect repeated full-arm extensions followed by foot adjustments; flag "overreaching".

**Feedback Examples:**

-   "Hips drifting away from the wall — try keeping hips closer to reduce shoulder torque."
-   "Right elbow remains bent on lock-off — work on extending for a stronger hold."

## Development Setup

### Backend (Python)

-   Use venv or virtualenv, Python 3.9+ (Note: Using Python 3.9.6 due to system availability)
-   **requirements.txt:**
    ```
    fastapi>=0.100.0
    uvicorn[standard]>=0.20.0
    mediapipe>=0.10.0
    opencv-python-headless>=4.8.0
    pydantic>=2.0.0
    python-multipart>=0.0.5
    python-magic>=0.4.0
    ```

### Frontend

-   Vite React + TypeScript template
-   Tailwind CSS for quick styling
-   **Package manager:** Bun
-   **package.json dependencies:**
    ```json
    {
    	"dependencies": {
    		"react": "^18.2.0",
    		"react-dom": "^18.2.0",
    		"react-router-dom": "^6.8.0",
    		"axios": "^1.6.0"
    	},
    	"devDependencies": {
    		"@types/react": "^18.2.0",
    		"@types/react-dom": "^18.2.0",
    		"@vitejs/plugin-react": "^4.0.0",
    		"autoprefixer": "^10.4.0",
    		"postcss": "^8.4.0",
    		"tailwindcss": "^3.3.0",
    		"typescript": "^5.0.0",
    		"vite": "^4.4.0"
    	}
    }
    ```

### Local Run Commands

**Backend:**

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

**Frontend:**

```bash
cd frontend
bun install
bun run dev
```

## Acceptance Tests

1. Select 30-60s demo video via file input; server returns 202 with id
2. After processing, `GET /api/results/:id` returns `status: complete`, `metrics`, and `feedback`
3. If overlay enabled, output video exists and displays skeleton overlay

## Risks & Mitigations

-   **Pose errors due to angle/lighting:** provide clear demo videos and UX hints (camera distance, frontal angle)
-   **Long processing times:** limit duration to 60s, sample frames (every 3rd frame), safety limit of 2000 frames (supports 60s at 60 FPS)
-   **Large uploads:** reject >50MB and show guidance
-   **Overfitting heuristics:** start conservative; surface raw metrics alongside feedback

## Future Roadmap (post-MVP)

-   Persistent storage and user accounts
-   Session tracking and trend charts
-   LLM-driven coaching summaries and personalization
-   Multi-attempt comparison and drill generation
-   Real-time analysis (WebRTC) for live coaching
-   **Hybrid sampling strategy**: Adaptive frame sampling based on movement detection
    -   Base sampling rate (N=5) for normal climbing movements
    -   High-speed sampling (N=2) for dynamic sections (dynos, foot slips, campus moves)
    -   Movement detection using optical flow or pose velocity analysis
    -   Automatic transition between sampling rates based on detected movement intensity
