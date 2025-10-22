"""
Video processing module for CruxVision.

This module handles video reading, frame sampling, and basic processing
using OpenCV. For M3a, we focus on basic video processing without MediaPipe.
"""

import cv2
import logging
import sys
from pathlib import Path
from typing import List, Tuple, Optional

# Add the project root to Python path for imports
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from backend.src.utils.file_utils import OUTPUT_DIR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SAMPLE_RATE = 3  # Process every 3rd frame
MAX_FRAMES_TO_PROCESS = 2000  # Safety limit: supports 60s videos at 60 FPS (60*60/3 = 1200 frames)


def read_video_frames(video_path: str) -> Tuple[List[cv2.Mat], dict]:
    """
    Read video file and extract sampled frames using OpenCV.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Tuple of (sampled_frames, video_info)
        - sampled_frames: List of OpenCV Mat objects (every Nth frame)
        - video_info: Dictionary with video metadata
        
    Raises:
        ValueError: If video file cannot be opened
        RuntimeError: If video processing fails
    """
    logger.info(f"Reading video: {video_path}")
    
    # Check if file exists
    if not Path(video_path).exists():
        raise ValueError(f"Video file not found: {video_path}")
    
    # Open video capture
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")
    
    try:
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        
        video_info = {
            "fps": fps,
            "total_frames": total_frames,
            "width": width,
            "height": height,
            "duration": duration,
            "sample_rate": SAMPLE_RATE
        }
        
        logger.info(f"Video info: {total_frames} frames, {fps:.2f} FPS, {duration:.2f}s duration")
        
        # Extract sampled frames
        sampled_frames = []
        frame_count = 0
        processed_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process every Nth frame
            if frame_count % SAMPLE_RATE == 0:
                sampled_frames.append(frame.copy())
                processed_count += 1
                
                # Safety check
                if processed_count >= MAX_FRAMES_TO_PROCESS:
                    logger.warning(f"Reached maximum frames limit ({MAX_FRAMES_TO_PROCESS})")
                    break
                    
            frame_count += 1
        
        logger.info(f"Processed {processed_count} frames from {total_frames} total frames")
        
        if len(sampled_frames) == 0:
            raise RuntimeError("No frames were extracted from video")
            
        return sampled_frames, video_info
        
    finally:
        cap.release()


def save_frame_info(frames: List[cv2.Mat], video_info: dict, analysis_id: str) -> str:
    """
    Save basic frame information to a text file for debugging.
    
    Args:
        frames: List of sampled frames
        video_info: Video metadata
        analysis_id: Unique analysis identifier
        
    Returns:
        Path to the saved info file
    """
    info_file = OUTPUT_DIR / f"frame_info_{analysis_id}.txt"
    
    with open(info_file, 'w') as f:
        f.write(f"Analysis ID: {analysis_id}\n")
        f.write(f"Video Info: {video_info}\n")
        f.write(f"Frames extracted: {len(frames)}\n")
        f.write(f"Sample rate: {SAMPLE_RATE}\n")
        
        for i, frame in enumerate(frames):
            f.write(f"Frame {i}: Shape {frame.shape}, Type {frame.dtype}\n")
    
    logger.info(f"Frame info saved to: {info_file}")
    return str(info_file)


def process_video_basic(video_path: str, analysis_id: str) -> dict:
    """
    Basic video processing function for M3a.
    
    This function reads a video, samples frames, and saves basic information.
    No pose detection is performed yet.
    
    Args:
        video_path: Path to the uploaded video file
        analysis_id: Unique identifier for this analysis
        
    Returns:
        Dictionary with processing results
        
    Raises:
        ValueError: If video file is invalid
        RuntimeError: If processing fails
    """
    logger.info(f"Starting basic video processing for analysis {analysis_id}")
    
    try:
        # Read video and extract frames
        frames, video_info = read_video_frames(video_path)
        
        # Save frame information for debugging
        info_file = save_frame_info(frames, video_info, analysis_id)
        
        # Prepare results
        results = {
            "analysis_id": analysis_id,
            "status": "success",
            "video_info": video_info,
            "frames_extracted": len(frames),
            "info_file": info_file,
            "message": f"Successfully processed {len(frames)} frames from video"
        }
        
        logger.info(f"Basic video processing completed: {len(frames)} frames")
        return results
        
    except Exception as e:
        logger.error(f"Video processing failed: {str(e)}")
        raise RuntimeError(f"Video processing failed: {str(e)}")


# Test function for M3a
def test_video_processing(video_path: str) -> None:
    """
    Test function to verify video processing works.
    
    Args:
        video_path: Path to test video file
    """
    print(f"Testing video processing with: {video_path}")
    
    try:
        # Generate test analysis ID
        import uuid
        test_id = str(uuid.uuid4())
        
        # Process video
        results = process_video_basic(video_path, test_id)
        
        print("✅ Video processing test successful!")
        print(f"Results: {results}")
        
    except Exception as e:
        print(f"❌ Video processing test failed: {e}")


if __name__ == "__main__":
    # Test with the uploaded video
    test_video = "backend/static/uploads/pose-test.MOV"
    test_video_processing(test_video)
