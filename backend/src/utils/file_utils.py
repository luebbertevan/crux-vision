import os
import uuid
from pathlib import Path
from typing import Optional

# Configuration constants
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi'}
UPLOAD_DIR = Path("backend/static/uploads")
OUTPUT_DIR = Path("backend/static/outputs")
OVERLAY_DIR = Path("backend/static/overlays")

def ensure_directories_exist():
    """Ensure upload, output, and overlay directories exist"""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OVERLAY_DIR.mkdir(parents=True, exist_ok=True)

def generate_analysis_id() -> str:
    """Generate a unique analysis ID"""
    return str(uuid.uuid4())

def validate_file_extension(filename: str) -> bool:
    """Check if file has an allowed video extension"""
    if not filename:
        return False
    
    file_ext = Path(filename).suffix.lower()
    return file_ext in ALLOWED_EXTENSIONS

def validate_file_size(file_size: int) -> bool:
    """Check if file size is within limits"""
    return file_size <= MAX_FILE_SIZE

def get_safe_filename(filename: str, analysis_id: str) -> str:
    """Generate a safe filename for storage with original filename and analysis ID"""
    import re
    file_ext = Path(filename).suffix.lower()
    original_name = Path(filename).stem
    
    # Sanitize original filename (remove special characters, keep alphanumeric, hyphens, underscores)
    sanitized_name = re.sub(r'[^a-zA-Z0-9\-_]', '_', original_name)
    
    # Truncate analysis ID to first 8 characters
    truncated_id = analysis_id[:8]
    
    return f"{sanitized_name}_{truncated_id}{file_ext}"

def cleanup_file(file_path: Path) -> bool:
    """Remove a file if it exists"""
    try:
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception:
        return False

def get_file_size_mb(file_size: int) -> float:
    """Convert bytes to MB for display"""
    return round(file_size / (1024 * 1024), 2)
