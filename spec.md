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
-   **File size limit:** 100MB max upload
-   **Processing:** Async background tasks (FastAPI BackgroundTasks)

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
      "video_url": "/static/overlays/overlay_<filename>_<id>.mp4" | null,
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

### ✅ M4 — Overlay video generation

## ✅ M4a — Basic overlay rendering

-   **Files:** `backend/src/pipeline/overlay.py` (basic implementation)
-   **Acceptance:** Render skeleton overlay on individual frames, save as image sequence for testing
-   **Test:** Verify skeleton overlay works on individual frames, custom OpenCV drawing functions correctly
-   **Dependencies:** Pose data from M3 (full frame sampling), OpenCV drawing utilities
-   **Scope:** Focus on getting the overlay rendering working correctly on frames using direct JSON-to-OpenCV drawing

## ✅ M4b — Full video generation

-   **Files:** `backend/src/pipeline/overlay.py` (video generation), `backend/src/pipeline/pose_detection.py` (integration)
-   **Acceptance:** Generate complete overlay video with smooth skeleton overlay, save to `static/outputs/`
-   **Test:** Full end-to-end video generation with continuous overlay (no flickering), API integration works
-   **Dependencies:** M4a overlay rendering, video processing pipeline, OpenCV video writing
-   **Scope:** Handle full video processing, frame synchronization, and API integration using custom skeleton rendering
-   **Implementation:** Automatic overlay video generation after pose processing completes
-   **Error Handling:** Graceful handling of missing pose data (skip overlay for that frame), fail fast on critical errors
-   **Quality:** Match original video properties (resolution, fps, codec)
-   **Storage:** Manual cleanup for now, keep overlay videos indefinitely

### M4b Video Generation Flow

```
POST /api/analyze
├── routes.py: analyze_video()
├── upload.py: validate_and_save_video()
├── routes.py: process_video_background_task() [Background]
└── pose_detection.py: process_video_with_pose()
    ├── read_video_frames()
    ├── process_frames_with_pose()
    ├── save_pose_data()
    ├── save_frame_info()
    └── overlay.py: generate_overlay_video() [NEW]
        ├── load_pose_data() [REUSE]
        ├── find_original_video() [NEW]
        ├── setup_video_writer() [NEW]
        ├── process_video_frames() [NEW]
        │   ├── load_video_frame() [REUSE from M4a]
        │   └── draw_skeleton_overlay() [REUSE from M4a]
        └── cleanup_video_writer() [NEW]
```

**Function Details:**

-   **Entry Point:** `pose_detection.py: process_video_with_pose()` calls `generate_overlay_video()` after pose processing
-   **Video Generation:** `overlay.py: generate_overlay_video()` orchestrates the full video creation process
-   **Frame Processing:** `process_video_frames()` loops through video frames, applying skeleton overlay when pose data exists
-   **Error Handling:** Missing pose data → skip overlay for that frame, corrupted frames → log warning and continue
-   **Code Reuse:** Leverages existing M4a functions (`load_pose_data`, `draw_skeleton_overlay`, `load_video_frame`)

**Output:** `backend/static/outputs/overlay_{analysis_id}.mp4` with skeleton overlay matching original video properties

### M5 — Minimal frontend

## ✅ M5a — Frontend project setup

-   **Files:** `frontend/` (new directory), `frontend/package.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
-   **Acceptance:** React + TypeScript + Vite + Tailwind project boots successfully, basic "Hello World" renders with Tailwind styling
-   **Test:** `bun run dev` starts frontend on localhost:5173, verify Tailwind CSS is working
-   **Dependencies:** None (new frontend project)

## ✅ M5b — File upload component

-   **Files:** `frontend/src/components/FileUpload.tsx`, `frontend/src/components/Header.tsx`
-   **Acceptance:** File upload interface with file picker, file validation (size ≤100MB, formats: MP4/MOV/AVI), upload progress indicator, error handling for invalid files
-   **Test:** Upload valid/invalid files, see validation errors, verify file size and format restrictions
-   **Dependencies:** M5a frontend setup

## ✅ M5c — API integration and status polling

-   **Files:** `frontend/src/api/client.ts`, `frontend/src/hooks/useAnalysis.ts`, `frontend/src/utils/types.ts`
-   **Acceptance:** Upload video to `/api/analyze`, receive analysis ID, poll `/api/results/{id}` for status updates, handle processing/complete/error states
-   **Test:** Upload → get analysis ID → poll until complete, verify error handling for failed uploads
-   **Dependencies:** M5b upload component, backend CORS configuration
-   **Backend Changes:** Add CORS middleware to FastAPI for frontend requests

## M5d — Processing UI and video display

-   **Files:** `frontend/src/components/VideoPlayer.tsx`, `frontend/src/components/ProcessingSpinner.tsx`, `frontend/src/App.tsx` (single-page flow)
-   **Acceptance:** Spinner during processing, overlay video player with play/pause/seek controls, responsive layout, error state display, basic analysis info display
-   **Test:** End-to-end flow: upload → processing spinner → view overlay video, verify video controls work
-   **Dependencies:** M5c API integration, backend overlay video generation from M4
-   **Design:** Single-page flow (no routing) - upload, processing, and results all on one page
-   **Results Display:** Basic analysis information below video player (analysis ID, completion status, minimal metrics)
-   **Actions:** "Upload New Video" button only for now

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
3. ✅ M5a: Frontend project boots successfully with Tailwind styling
4. ✅ M5b: File upload component validates files and shows progress
5. ✅ M5c: API integration uploads video and polls for completion
6. M5d: End-to-end web UI flow: upload → processing → view overlay video (single-page flow)
7. Visual validation of pose detection accuracy via skeleton overlay (M4)
8. Heuristic analysis matches visual observations (M6)

## Risks & Mitigations

-   **Pose errors due to angle/lighting:** provide clear demo videos and UX hints (camera distance, frontal angle)
-   **Long processing times:** limit duration to 60s, process every frame, safety limit of 6000 frames (supports 60s at 60 FPS)
-   **Large uploads:** reject >100MB and show guidance
-   **Overfitting heuristics:** start conservative; surface raw metrics alongside feedback

## Future Roadmap (post-MVP)

### Analysis Page & Results Display

-   **Dedicated Analysis Page**: Separate route/page for viewing analysis results with enhanced layout and navigation
-   **Enhanced Results Display**: Detailed metrics visualization, progress charts, pose confidence scores
-   **Analysis History**: View previous analyses, compare results over time
-   **Export Functionality**: Download analysis reports, share results via URL
-   **Advanced Video Controls**: Frame-by-frame navigation, slow-motion playback, pose overlay toggle

### Actions After Analysis

-   **Save Analysis**: Bookmark favorite analyses for future reference
-   **Share Results**: Generate shareable links to analysis results
-   **Compare Analyses**: Side-by-side comparison of multiple attempts
-   **Generate Drills**: AI-suggested training exercises based on analysis results
-   **Export Data**: Download pose data, metrics, and feedback as JSON/CSV
-   **Create Training Plan**: Generate personalized training recommendations

### Enhanced Visualization

-   **Movement visualization**: Center of balance heat maps, joint angles visualization, velocity vectors with toggle on/off functionality
-   **Video timestamped LLM feedback**: Per-movement coaching feedback synchronized with video timestamps
-   **Side-by-side comparison mode**: Compare multiple attempts of the same route or movement
-   **Custom skeleton visualization**: Replace default MediaPipe skeleton with custom icons styling and animated effects
-   **Frontend video controls**: Rotation controls, zoom, playback speed adjustment, frame-by-frame navigation

### Advanced Features

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
