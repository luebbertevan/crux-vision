from pathlib import Path
from fastapi import UploadFile, HTTPException
from backend.src.utils.file_utils import (
    validate_file_extension, 
    validate_file_size, 
    get_safe_filename,
    ensure_directories_exist,
    UPLOAD_DIR
)

# File signatures for video files (first few bytes)
VIDEO_SIGNATURES = {
    b'\x00\x00\x00\x20ftypmp42',  # MP4
    b'\x00\x00\x00\x18ftypqt',    # MOV/QuickTime
    b'RIFF',                       # AVI (starts with RIFF)
}

async def validate_and_save_video(file: UploadFile, analysis_id: str) -> str:
    """
    Validate uploaded video file and save it to storage.
    
    Args:
        file: FastAPI UploadFile object
        analysis_id: Unique identifier for this analysis
        
    Returns:
        str: Path to saved file
        
    Raises:
        HTTPException: If validation fails
    """
    # Ensure directories exist
    ensure_directories_exist()
    
    # Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=400, 
            detail="No filename provided"
        )
    
    # Validate file extension
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Allowed formats: MP4, MOV, AVI"
        )
    
    # Read file content for validation
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    if not validate_file_size(file_size):
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: 50MB"
        )
    
    # Validate file signature (magic bytes)
    try:
        is_valid_video = False
        
        # Check for MP4/MOV files (ftyp container)
        if content.startswith(b'\x00\x00\x00') and b'ftyp' in content[:20]:
            # Check for specific video types
            if b'mp42' in content[:20] or b'qt  ' in content[:20] or b'isom' in content[:20]:
                is_valid_video = True
        
        # Check for AVI files (RIFF header)
        elif content.startswith(b'RIFF') and b'AVI ' in content[:20]:
            is_valid_video = True
            
        if not is_valid_video:
            raise HTTPException(
                status_code=400,
                detail="Invalid video file format detected"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Unable to validate file type"
        )
    
    # Generate safe filename and save file
    safe_filename = get_safe_filename(file.filename, analysis_id)
    file_path = UPLOAD_DIR / safe_filename
    
    try:
        # Write file to disk
        with open(file_path, "wb") as f:
            f.write(content)
        
        return str(file_path)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file"
        )
