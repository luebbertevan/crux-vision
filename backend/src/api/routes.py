from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from backend.src.models.schema import AnalyzeResponse, ErrorResponse, Result
from backend.src.pipeline.upload import validate_and_save_video
from backend.src.pipeline.pose_detection import process_video_background_task
from backend.src.utils.file_utils import generate_analysis_id
from backend.src.utils.analysis_storage import create_analysis_record, get_analysis_record
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/ping")
async def ping():
    """Health check endpoint"""
    return {"message": "pong"}

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload and analyze a climbing video.
    
    Args:
        background_tasks: FastAPI background tasks
        file: Video file to analyze (MP4, MOV, AVI, max 50MB)
        
    Returns:
        AnalyzeResponse: Analysis ID and status URL
        
    Raises:
        HTTPException: If file validation fails
    """
    try:
        # Generate unique analysis ID
        analysis_id = generate_analysis_id()
        
        # Validate and save the uploaded video
        file_path = await validate_and_save_video(file, analysis_id)
        
        # Create analysis record
        create_analysis_record(analysis_id)
        
        # Start background pose processing (M3c)
        background_tasks.add_task(process_video_background_task, file_path, analysis_id)
        
        logger.info(f"Started background processing for analysis {analysis_id}")
        
        # Return response with analysis ID and status URL
        return AnalyzeResponse(
            id=analysis_id,
            status_url=f"/api/results/{analysis_id}"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=500,
            detail="Internal server error during video upload"
        )


@router.get("/results/{analysis_id}", response_model=Result)
async def get_results(analysis_id: str):
    """
    Get analysis results by ID.
    
    Args:
        analysis_id: Unique identifier for the analysis
        
    Returns:
        Result: Analysis status and results
        
    Raises:
        HTTPException: If analysis not found
    """
    # Get analysis record
    analysis_record = get_analysis_record(analysis_id)
    
    if not analysis_record:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )
    
    # Prepare metrics from processing info
    metrics = None
    processing_info = analysis_record.get("processing_info")
    if processing_info:
        # For M3c, we'll create basic metrics from pose data
        # In M4, we'll add proper heuristic analysis
        metrics = {
            "avg_hip_angle": None,  # Will be calculated in M4
            "avg_knee_angle": None,  # Will be calculated in M4
            "stability_score": None   # Will be calculated in M4
        }
    
    # Prepare video URL for overlay video
    video_url = None
    if analysis_record.get("status") == "complete":
        # Check if overlay video was generated
        processing_info = analysis_record.get("processing_info", {})
        overlay_file = processing_info.get("overlay_file")
        if overlay_file:
            # Extract filename from full path for URL
            from pathlib import Path
            filename = Path(overlay_file).name
            video_url = f"/static/overlays/{filename}"
    
    # Return result
    return Result(
        id=analysis_record["id"],
        status=analysis_record["status"],
        created_at=analysis_record["created_at"],
        metrics=metrics,
        feedback=None,  # Will be added in M4
        video_url=video_url,
        error_message=analysis_record.get("error_message")
    )
