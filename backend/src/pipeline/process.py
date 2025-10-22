"""
Video processing module for CruxVision.

This module handles video reading, frame sampling, and pose detection
using OpenCV and MediaPipe. For M3b, we add MediaPipe pose detection to sampled frames.
"""

import cv2
import mediapipe as mp
import logging
import sys
import json
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any

# Add the project root to Python path for imports
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from backend.src.utils.file_utils import OUTPUT_DIR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SAMPLE_RATE = 3  # Process every 3rd frame
MAX_FRAMES_TO_PROCESS = 2000  # Safety limit: supports 60s videos at 60 FPS (60*60/3 = 1200 frames)

# Confidence thresholds for different landmarks (from testing strategy)
CONFIDENCE_LEVELS = {
    "high": 0.7,      # Reliable for analysis
    "medium": 0.3,    # Use with caution
    "low": 0.1        # Flag but keep
}

LANDMARK_THRESHOLDS = {
    "shoulders": 0.5,    # Important for stability analysis
    "hips": 0.4,         # Critical for center of mass
    "hands": 0.1,        # Often occluded - keep everything
    "feet": 0.1,         # Often occluded - keep everything
    "elbows": 0.3,       # Important for technique
    "knees": 0.3         # Important for technique
}

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)


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


def detect_pose_in_frame(frame: cv2.Mat) -> Dict[str, Any]:
    """
    Detect pose landmarks in a single frame using MediaPipe.
    
    Args:
        frame: OpenCV Mat object (BGR format)
        
    Returns:
        Dictionary with pose detection results
    """
    # Convert BGR to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process frame with MediaPipe
    results = pose.process(rgb_frame)
    
    pose_data = {
        "pose_detected": False,
        "overall_confidence": 0.0,
        "confidence_level": "low",
        "landmarks": [],
        "quality_flags": {
            "hands_occluded": False,
            "feet_hidden": False,
            "dynamic_movement": False,
            "lighting_poor": False
        }
    }
    
    if results.pose_landmarks:
        pose_data["pose_detected"] = True
        
        # Extract landmark data
        landmarks = []
        total_confidence = 0.0
        visible_landmarks = 0
        
        for idx, landmark in enumerate(results.pose_landmarks.landmark):
            landmark_name = mp_pose.PoseLandmark(idx).name.lower()
            
            # Get confidence level based on landmark type
            confidence_threshold = LANDMARK_THRESHOLDS.get(landmark_name.split('_')[0], 0.3)
            confidence_level = "high" if landmark.visibility >= CONFIDENCE_LEVELS["high"] else \
                             "medium" if landmark.visibility >= CONFIDENCE_LEVELS["medium"] else "low"
            
            landmark_data = {
                "name": landmark_name,
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility,
                "confidence": confidence_level,
                "threshold": confidence_threshold
            }
            
            landmarks.append(landmark_data)
            
            # Track overall confidence
            if landmark.visibility > 0:
                total_confidence += landmark.visibility
                visible_landmarks += 1
        
        # Calculate overall confidence
        if visible_landmarks > 0:
            pose_data["overall_confidence"] = total_confidence / visible_landmarks
            pose_data["confidence_level"] = "high" if pose_data["overall_confidence"] >= CONFIDENCE_LEVELS["high"] else \
                                          "medium" if pose_data["overall_confidence"] >= CONFIDENCE_LEVELS["medium"] else "low"
        
        pose_data["landmarks"] = landmarks
        
        # Set quality flags based on landmark visibility
        hand_landmarks = [lm for lm in landmarks if "hand" in lm["name"]]
        foot_landmarks = [lm for lm in landmarks if "foot" in lm["name"] or "ankle" in lm["name"]]
        
        pose_data["quality_flags"]["hands_occluded"] = any(lm["confidence"] == "low" for lm in hand_landmarks)
        pose_data["quality_flags"]["feet_hidden"] = any(lm["confidence"] == "low" for lm in foot_landmarks)
    
    return pose_data


def process_frames_with_pose(frames: List[cv2.Mat]) -> List[Dict[str, Any]]:
    """
    Process all sampled frames with MediaPipe pose detection.
    
    Args:
        frames: List of OpenCV Mat objects
        
    Returns:
        List of pose detection results for each frame
    """
    logger.info(f"Processing {len(frames)} frames with MediaPipe pose detection")
    
    pose_results = []
    
    for i, frame in enumerate(frames):
        try:
            pose_data = detect_pose_in_frame(frame)
            pose_data["frame_index"] = i
            pose_results.append(pose_data)
            
            if i % 50 == 0:  # Log progress every 50 frames
                logger.info(f"Processed frame {i}/{len(frames)}")
                
        except Exception as e:
            logger.warning(f"Error processing frame {i}: {str(e)}")
            # Add error frame data
            pose_results.append({
                "frame_index": i,
                "pose_detected": False,
                "overall_confidence": 0.0,
                "confidence_level": "low",
                "landmarks": [],
                "quality_flags": {},
                "error": str(e)
            })
    
    logger.info(f"Completed pose detection on {len(frames)} frames")
    return pose_results


def save_pose_data(pose_results: List[Dict[str, Any]], video_info: dict, analysis_id: str) -> str:
    """
    Save pose detection results to JSON file.
    
    Args:
        pose_results: List of pose detection results
        video_info: Video metadata
        analysis_id: Unique analysis identifier
        
    Returns:
        Path to the saved JSON file
    """
    pose_file = OUTPUT_DIR / f"pose_data_{analysis_id}.json"
    
    # Prepare data for JSON serialization
    output_data = {
        "analysis_id": analysis_id,
        "video_info": video_info,
        "processing_info": {
            "total_frames": len(pose_results),
            "poses_detected": sum(1 for result in pose_results if result.get("pose_detected", False)),
            "avg_confidence": sum(result.get("overall_confidence", 0) for result in pose_results) / len(pose_results) if pose_results else 0,
            "confidence_levels": {
                "high": sum(1 for result in pose_results if result.get("confidence_level") == "high"),
                "medium": sum(1 for result in pose_results if result.get("confidence_level") == "medium"),
                "low": sum(1 for result in pose_results if result.get("confidence_level") == "low")
            }
        },
        "frames": pose_results
    }
    
    with open(pose_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    logger.info(f"Pose data saved to: {pose_file}")
    return str(pose_file)


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


def process_video_with_pose(video_path: str, analysis_id: str) -> dict:
    """
    Enhanced video processing function for M3b.
    
    This function reads a video, samples frames, runs MediaPipe pose detection,
    and saves pose data to JSON. Includes simple confidence tracking.
    
    Args:
        video_path: Path to the uploaded video file
        analysis_id: Unique identifier for this analysis
        
    Returns:
        Dictionary with processing results including pose data
        
    Raises:
        ValueError: If video file is invalid
        RuntimeError: If processing fails
    """
    logger.info(f"Starting video processing with pose detection for analysis {analysis_id}")
    
    try:
        # Read video and extract frames
        frames, video_info = read_video_frames(video_path)
        
        # Process frames with MediaPipe pose detection
        pose_results = process_frames_with_pose(frames)
        
        # Save pose data to JSON
        pose_file = save_pose_data(pose_results, video_info, analysis_id)
        
        # Save frame information for debugging
        info_file = save_frame_info(frames, video_info, analysis_id)
        
        # Calculate processing statistics
        poses_detected = sum(1 for result in pose_results if result.get("pose_detected", False))
        avg_confidence = sum(result.get("overall_confidence", 0) for result in pose_results) / len(pose_results) if pose_results else 0
        
        # Prepare results
        results = {
            "analysis_id": analysis_id,
            "status": "success",
            "video_info": video_info,
            "frames_extracted": len(frames),
            "poses_detected": poses_detected,
            "avg_confidence": avg_confidence,
            "pose_file": pose_file,
            "info_file": info_file,
            "message": f"Successfully processed {len(frames)} frames, detected poses in {poses_detected} frames"
        }
        
        logger.info(f"Video processing with pose detection completed: {len(frames)} frames, {poses_detected} poses detected")
        return results
        
    except Exception as e:
        logger.error(f"Video processing with pose detection failed: {str(e)}")
        raise RuntimeError(f"Video processing with pose detection failed: {str(e)}")


def process_video_basic(video_path: str, analysis_id: str) -> dict:
    """
    Basic video processing function for M3a (kept for backward compatibility).
    
    This function reads a video, samples frames, and saves basic information.
    No pose detection is performed.
    
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


# Test function for M3b
def test_video_processing_with_pose(video_path: str) -> None:
    """
    Test function to verify video processing with pose detection works.
    
    Args:
        video_path: Path to test video file
    """
    print(f"Testing video processing with pose detection: {video_path}")
    
    try:
        # Generate test analysis ID
        import uuid
        test_id = str(uuid.uuid4())
        
        # Process video with pose detection
        results = process_video_with_pose(video_path, test_id)
        
        print("✅ Video processing with pose detection test successful!")
        print(f"Results: {results}")
        
        # Print pose detection statistics
        if 'poses_detected' in results:
            print(f"📊 Pose Detection Stats:")
            print(f"   - Frames processed: {results['frames_extracted']}")
            print(f"   - Poses detected: {results['poses_detected']}")
            print(f"   - Average confidence: {results['avg_confidence']:.3f}")
            print(f"   - Pose detection rate: {results['poses_detected']/results['frames_extracted']*100:.1f}%")
        
    except Exception as e:
        print(f"❌ Video processing with pose detection test failed: {e}")


# Test function for M3a (kept for backward compatibility)
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
    # Test with the uploaded video using M3b pose detection
    test_video = "backend/static/uploads/pose-test.MOV"
    test_video_processing_with_pose(test_video)
