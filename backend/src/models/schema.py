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
