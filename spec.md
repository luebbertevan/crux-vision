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
        upload.py            # Load & validate video
        pose_detection.py    # MediaPipe + OpenCV wrapper
        analysis.py          # Heuristics and metrics
        overlay.py           # Annotated overlay renderer (optional)
      models/
        schema.py            # Pydantic models
      utils/
        file_utils.py        # File validation & cleanup
        analysis_storage.py  # Analysis status tracking & storage
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

### ✅ M0 — Specification

-   **Purpose:** Agree spec, milestones, file structure
-   **Acceptance:** This `spec.md` reviewed & approved

### ✅ M1 — Backend bootstrap (FastAPI + ping)

-   **Files:** `backend/main.py`, `backend/src/api/routes.py`, `requirements.txt`
-   **Acceptance:** `uvicorn backend.main:app --reload` serves `/api/ping` -> `{message: 'pong'}`
-   **Test:** curl GET localhost:8000/api/ping

### ✅ M2 — File upload endpoint & storage

-   **Files:** `backend/src/api/routes.py`, `backend/src/pipeline/upload.py`, `backend/src/utils/file_utils.py`
-   **Acceptance:** `POST /api/analyze` accepts video files via multipart form, validates format/size, stores in `static/uploads/`, returns 202 with id
-   **Test:** curl POST with valid/invalid files; proper error handling for large/invalid files

### ✅ M3 — Pose extraction

## ✅ M3a — Basic video processing (OpenCV)

-   **Files:** `backend/src/pipeline/pose_detection.py`
-   **Acceptance:** Reads uploaded video, extracts frames (full frame sampling), basic error handling
-   **Test:** Can read frames from uploaded video, verify frame sampling works
-   **Dependencies:** OpenCV only (no MediaPipe yet)

## ✅ M3b — MediaPipe integration

-   **Files:** `backend/src/pipeline/pose_detection.py` (add MediaPipe)
-   **Acceptance:** Runs MediaPipe Pose on sampled frames, detects keypoints with simple confidence tracking
-   **Test:** Verify pose detection works on sample frames, handles low confidence poses gracefully
-   **Dependencies:** OpenCV + MediaPipe
-   **Error Handling:** Simple confidence thresholds, keep all frames (occlusion is normal in climbing)

## ✅ M3c — JSON output & integration

-   **Files:** `backend/src/pipeline/pose_detection.py` (add JSON output), `backend/src/api/routes.py` (integration), `backend/src/utils/analysis_storage.py` (new)
-   **Acceptance:** Background processing, results endpoint, status tracking, saves keypoints to JSON
-   **Test:** Full end-to-end processing: upload → background processing → status checking → results retrieval
-   **Performance:** ~6-9 seconds processing time for 12-second video with full frame sampling
-   **API Integration:** Upload returns immediately (202), background processing, `/api/results/{id}` endpoint

### M4 — Overlay video generation

## ✅ M4a — Basic overlay rendering

-   **Files:** `backend/src/pipeline/overlay.py` (basic implementation)
-   **Acceptance:** Render skeleton overlay on individual frames, save as image sequence for testing
-   **Test:** Verify skeleton overlay works on individual frames, custom OpenCV drawing functions correctly
-   **Dependencies:** Pose data from M3 (full frame sampling), OpenCV drawing utilities
-   **Scope:** Focus on getting the overlay rendering working correctly on frames using direct JSON-to-OpenCV drawing

## M4b — Full video generation

-   **Files:** `backend/src/pipeline/overlay.py` (video generation), `backend/src/api/routes.py` (integration)
-   **Acceptance:** Generate complete overlay video with smooth skeleton overlay, save to `static/outputs/`
-   **Test:** Full end-to-end video generation with continuous overlay (no flickering), API integration works
-   **Dependencies:** M4a overlay rendering, video processing pipeline, OpenCV video writing
-   **Scope:** Handle full video processing, frame synchronization, and API integration using custom skeleton rendering

### M5 — Minimal frontend

-   **Files:** `frontend/` (new directory)
-   **Acceptance:** Simple web interface for video upload, progress tracking, results display
-   **Test:** Upload video via web UI, see processing status, view results and overlay video
-   **Dependencies:** Backend API from M1-M3, overlay video from M4

### M6 — Heuristic analysis & feedback

-   **Files:** `backend/src/pipeline/analysis.py`
-   **Acceptance:** Compute average joint angles and a stability score, produce 2–5 human-readable feedback items
-   **Test:** `GET /api/results/:id` shows metrics and feedback, frontend displays analysis
-   **Dependencies:** Pose data from M3, visual validation from M4, frontend from M5

### M7 — LLM feedback and coaching

-   **Files:** `backend/src/pipeline/llm_analysis.py`, `backend/src/api/routes.py` (LLM endpoint)
-   **Acceptance:** Generate contextual coaching feedback using LLM based on heuristic analysis results
-   **Test:** LLM provides personalized, actionable feedback based on pose analysis metrics
-   **Dependencies:** Heuristic analysis from M6, LLM API integration (OpenAI/Anthropic)

### M8 — Small polish & docs

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

1. ✅ Select 30-60s demo video via file input; server returns 202 with id
2. ✅ After processing, `GET /api/results/:id` returns `status: complete`, `metrics`, and `feedback`
3. Upload video via web UI, see processing status, view results and overlay video (M5)
4. Visual validation of pose detection accuracy via skeleton overlay (M4)
5. Heuristic analysis matches visual observations (M6)

## Risks & Mitigations

-   **Pose errors due to angle/lighting:** provide clear demo videos and UX hints (camera distance, frontal angle)
-   **Long processing times:** limit duration to 60s, process every frame, safety limit of 6000 frames (supports 60s at 60 FPS)
-   **Large uploads:** reject >50MB and show guidance
-   **Overfitting heuristics:** start conservative; surface raw metrics alongside feedback

## Future Roadmap (post-MVP)

-   **Movement visualization**: Center of balance heat maps, joint angles visualization, velocity vectors with toggle on/off functionality
-   **Video timestamped LLM feedback**: Per-movement coaching feedback synchronized with video timestamps
-   **Side-by-side comparison mode**: Compare multiple attempts of the same route or movement
-   **Custom skeleton visualization**: Replace default MediaPipe skeleton with custom icons styling and animated effects
-   Stats on a route: angle/type of climbing, overhang, roof, slab. how many moves. dynamic
-   staticPersistent storage and user accounts
-   Session tracking and trend charts
-   LLM-driven coaching summaries and personalization
-   Multi-attempt comparison and drill generation
-   Real-time analysis (WebRTC) for live coaching
-   **Hybrid sampling strategy**: Adaptive frame sampling based on movement detection
    -   Base sampling rate (N=5) for normal climbing movements
    -   High-speed sampling (N=2) for dynamic sections (dynos, foot slips, campus moves)
    -   Movement detection using optical flow or pose velocity analysis
    -   Automatic transition between sampling rates based on detected movement intensity
-   **Advanced error handling**: Interpolation for missing poses, temporal smoothing, complex confidence analysis
-   **Enhanced pose tracking**: Face pose detection (when not occluded), advanced occlusion detection

## Testing Strategy

For detailed testing procedures, error handling approaches, and confidence threshold specifications, refer to `TESTING_STRATEGY.md`.
