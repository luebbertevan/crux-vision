from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from backend.src.models.schema import AnalyzeResponse, ErrorResponse
from backend.src.pipeline.input import validate_and_save_video
from backend.src.utils.file_utils import generate_analysis_id

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
        
        # TODO: In M3, we'll add background processing here
        # For now, we just store the file and return the ID
        
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
