from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from backend.src.models.schema import AnalyzeResponse, ErrorResponse
from backend.src.pipeline.input import validate_and_save_video
from backend.src.pipeline.process import process_video_with_pose
from backend.src.utils.file_utils import generate_analysis_id
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
        
        # Process video with pose detection (M3b)
        try:
            processing_results = process_video_with_pose(file_path, analysis_id)
            logger.info(f"Pose detection completed for analysis {analysis_id}")
        except Exception as e:
            logger.error(f"Pose detection failed for analysis {analysis_id}: {str(e)}")
            # Continue anyway - we'll handle this in M3c with proper error handling
        
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
