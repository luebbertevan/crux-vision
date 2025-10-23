"""
Video output and overlay rendering module for CruxVision.

This module handles skeleton overlay rendering using OpenCV drawing functions.
For M4a, we implement basic overlay rendering on individual frames using JSON pose data.
The skeleton is simplified for climbing analysis - no detailed face landmarks, just head indicator.
"""

import cv2
import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Add the project root to Python path for imports
import sys
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from backend.src.utils.file_utils import OUTPUT_DIR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MediaPipe pose connections (climbing-focused, simplified)
POSE_CONNECTIONS = [
    # Simple head indicator (nose to shoulders)
    (0, 11), (0, 12),  # Nose to shoulders
    
    # Body connections
    (11, 12), (11, 13), (12, 14), (13, 15), (14, 16),  # Arms
    (11, 23), (12, 24),  # Shoulders to hips
    (23, 24), (23, 25), (24, 26), (25, 27), (26, 28),  # Hips to legs
    (27, 29), (28, 30), (29, 31), (30, 32),  # Legs to feet
    
    # Hand connections (individual hands only - no cross-hand connections)
    (15, 17), (17, 19), (19, 21), (21, 15),  # Left hand (wrist, pinky, index, thumb)
    (16, 18), (18, 20), (20, 22), (22, 16),  # Right hand (wrist, pinky, index, thumb)
]

# Landmark names for reference (33 landmarks total)
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
    "right_heel", "left_foot_index", "right_foot_index"
]


def load_pose_data(analysis_id: str) -> Dict[str, Any]:
    """
    Load pose data from JSON file.
    
    Args:
        analysis_id: Unique analysis identifier
        
    Returns:
        Dictionary containing pose data and video info
        
    Raises:
        FileNotFoundError: If pose data file doesn't exist
        json.JSONDecodeError: If JSON file is corrupted
    """
    pose_file = OUTPUT_DIR / f"pose_data_{analysis_id}.json"
    
    if not pose_file.exists():
        raise FileNotFoundError(f"Pose data file not found: {pose_file}")
    
    try:
        with open(pose_file, 'r') as f:
            pose_data = json.load(f)
        
        logger.info(f"Loaded pose data for analysis {analysis_id}")
        return pose_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON file {pose_file}: {e}")
        raise


def rotate_landmark_coordinates(landmarks_json: List[Dict], rotation: int, original_shape: Tuple[int, int], rotated_shape: Tuple[int, int]) -> List[Dict]:
    """
    Rotate landmark coordinates to match video rotation.
    
    Args:
        landmarks_json: List of landmark data from JSON
        rotation: Rotation angle in degrees (0, 90, 180, 270)
        original_shape: Original video shape (height, width, channels)
        rotated_shape: Rotated video shape (height, width, channels)
        
    Returns:
        List of landmarks with rotated coordinates
    """
    if rotation == 0:
        return landmarks_json
    
    orig_height, orig_width = original_shape[:2]
    rot_height, rot_width = rotated_shape[:2]
    rotated_landmarks = []
    
    for landmark in landmarks_json:
        # Get normalized coordinates from original video
        x_norm = float(landmark["x"])
        y_norm = float(landmark["y"])
        
        # Convert to pixel coordinates in original video
        x_pixel = x_norm * orig_width
        y_pixel = y_norm * orig_height
        
        # Apply rotation transformation
        if rotation == 90:
            # 90° clockwise: (x, y) -> (orig_height - y, x)
            new_x = orig_height - y_pixel
            new_y = x_pixel
        elif rotation == 180:
            # 180°: (x, y) -> (orig_width - x, orig_height - y)
            new_x = orig_width - x_pixel
            new_y = orig_height - y_pixel
        elif rotation == 270:
            # 270° clockwise: (x, y) -> (y, orig_width - x)
            new_x = y_pixel
            new_y = orig_width - x_pixel
        else:
            # No rotation
            new_x = x_pixel
            new_y = y_pixel
        
        # Convert to normalized coordinates in rotated video
        new_x_norm = new_x / rot_width
        new_y_norm = new_y / rot_height
        
        # Create rotated landmark
        rotated_landmark = landmark.copy()
        rotated_landmark["x"] = new_x_norm
        rotated_landmark["y"] = new_y_norm
        rotated_landmarks.append(rotated_landmark)
    
    return rotated_landmarks


def get_landmark_coords(landmarks_json: List[Dict], landmark_index: int, image_shape: Tuple[int, int]) -> Optional[Tuple[int, int]]:
    """
    Get pixel coordinates for a landmark by index.
    
    Args:
        landmarks_json: List of landmark data from JSON
        landmark_index: Index of the landmark (0-32)
        image_shape: Image shape (height, width, channels)
        
    Returns:
        Tuple of (x, y) pixel coordinates, or None if landmark not found
    """
    if landmark_index >= len(landmarks_json):
        return None
    
    landmark = landmarks_json[landmark_index]
    
    # Convert normalized coordinates to pixel coordinates
    x = int(landmark["x"] * image_shape[1])
    y = int(landmark["y"] * image_shape[0])
    
    # Check if coordinates are within image bounds
    if 0 <= x < image_shape[1] and 0 <= y < image_shape[0]:
        return (x, y)
    
    return None


def draw_skeleton_connections(image: cv2.Mat, landmarks_json: List[Dict], style: Dict[str, Any] = None) -> cv2.Mat:
    """
    Draw skeleton connections between landmarks.
    
    Args:
        image: OpenCV image to draw on
        landmarks_json: List of landmark data from JSON
        style: Drawing style configuration
        
    Returns:
        Image with skeleton connections drawn
    """
    if style is None:
        style = {
            "connection_color": (255, 255, 255),  # White
            "connection_thickness": 2
        }
    
    for connection in POSE_CONNECTIONS:
        point1 = get_landmark_coords(landmarks_json, connection[0], image.shape)
        point2 = get_landmark_coords(landmarks_json, connection[1], image.shape)
        
        if point1 and point2:
            cv2.line(image, point1, point2, style["connection_color"], style["connection_thickness"])
    
    return image


def draw_skeleton_landmarks(image: cv2.Mat, landmarks_json: List[Dict], style: Dict[str, Any] = None) -> cv2.Mat:
    """
    Draw skeleton landmarks (joint points).
    For climbing analysis, we only draw the nose and body landmarks, skipping face details.
    
    Args:
        image: OpenCV image to draw on
        landmarks_json: List of landmark data from JSON
        style: Drawing style configuration
        
    Returns:
        Image with skeleton landmarks drawn
    """
    if style is None:
        style = {
            "landmark_color": (0, 255, 0),  # Green
            "landmark_radius": 4,
            "confidence_based": True
        }
    
    # Face landmark indices to skip (except nose which is 0)
    face_landmarks_to_skip = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # All face landmarks except nose
    
    for i, landmark in enumerate(landmarks_json):
        # Skip face landmarks except nose
        if i in face_landmarks_to_skip:
            continue
            
        coords = get_landmark_coords(landmarks_json, i, image.shape)
        if coords:
            x, y = coords
            
            # Determine landmark color based on confidence if enabled
            if style.get("confidence_based", False):
                confidence = landmark.get("visibility", 0.0)
                if confidence > 0.8:
                    color = (0, 255, 0)  # Green - high confidence
                elif confidence > 0.5:
                    color = (255, 255, 0)  # Yellow - medium confidence
                else:
                    color = (255, 0, 0)  # Red - low confidence
            else:
                color = style["landmark_color"]
            
            cv2.circle(image, (x, y), style["landmark_radius"], color, -1)
    
    return image


def draw_skeleton_overlay(image: cv2.Mat, landmarks_json: List[Dict], style: Dict[str, Any] = None, rotation: int = 0, original_shape: Tuple[int, int] = None) -> cv2.Mat:
    """
    Draw complete skeleton overlay on an image.
    
    Args:
        image: OpenCV image to draw on
        landmarks_json: List of landmark data from JSON
        style: Drawing style configuration
        rotation: Rotation angle in degrees (0, 90, 180, 270)
        original_shape: Original video shape (height, width) before rotation
        
    Returns:
        Image with complete skeleton overlay
    """
    if style is None:
        style = {
            "connection_color": (255, 255, 255),  # White connections
            "connection_thickness": 2,
            "landmark_color": (0, 255, 0),  # Green landmarks
            "landmark_radius": 4,
            "confidence_based": True
        }
    
    # Create a copy to avoid modifying the original
    annotated_image = image.copy()
    
    # Rotate landmark coordinates if needed
    if rotation != 0 and original_shape is not None:
        landmarks_json = rotate_landmark_coordinates(landmarks_json, rotation, original_shape, image.shape)
    
    # Draw connections first (so landmarks appear on top)
    annotated_image = draw_skeleton_connections(annotated_image, landmarks_json, style)
    
    # Draw landmarks
    annotated_image = draw_skeleton_landmarks(annotated_image, landmarks_json, style)
    
    return annotated_image


def load_video_frame(video_path: str, frame_index: int) -> Optional[cv2.Mat]:
    """
    Load a specific frame from a video file.
    
    Args:
        video_path: Path to the video file
        frame_index: Index of the frame to load
        
    Returns:
        OpenCV Mat object or None if frame not found
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Cannot open video file: {video_path}")
        return None
    
    try:
        # Set frame position
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        
        # Read frame
        ret, frame = cap.read()
        if ret:
            return frame
        else:
            logger.warning(f"Could not read frame {frame_index} from {video_path}")
            return None
            
    finally:
        cap.release()


def test_overlay_on_sample_frames(analysis_id: str, num_frames: int = 5) -> None:
    """
    Test overlay rendering on sample frames from an analysis.
    
    Args:
        analysis_id: Unique analysis identifier
        num_frames: Number of sample frames to test
    """
    logger.info(f"Testing overlay rendering for analysis {analysis_id}")
    
    try:
        # Load pose data
        pose_data = load_pose_data(analysis_id)
        frames_data = pose_data["frames"]
        video_info = pose_data["video_info"]
        
        # Determine sample frame indices
        total_frames = len(frames_data)
        sample_indices = [i * total_frames // num_frames for i in range(num_frames)]
        
        logger.info(f"Testing overlay on {num_frames} sample frames: {sample_indices}")
        
        # Load original video to get frames
        # Try different possible video file extensions
        video_path = None
        for ext in ['.mov', '.MOV', '.mp4', '.avi']:
            potential_path = f"backend/static/uploads/{analysis_id}{ext}"
            if Path(potential_path).exists():
                video_path = potential_path
                break
        
        # If not found by analysis ID, try to find any video file
        if video_path is None:
            upload_dir = Path("backend/static/uploads")
            video_files = list(upload_dir.glob("*.mov")) + list(upload_dir.glob("*.MOV")) + list(upload_dir.glob("*.mp4"))
            if video_files:
                video_path = str(video_files[0])
                logger.info(f"Using video file: {video_path}")
            else:
                logger.error(f"No video file found in uploads directory")
                return
        
        # Test overlay on each sample frame
        for i, frame_idx in enumerate(sample_indices):
            frame_data = frames_data[frame_idx]
            
            # Load original frame
            original_frame = load_video_frame(video_path, frame_idx)
            if original_frame is None:
                logger.warning(f"Could not load frame {frame_idx}")
                continue
            
            # Apply rotation if needed (same logic as video generation)
            rotation = get_video_rotation(video_path)
            
            # Get original video dimensions before rotation
            cap = cv2.VideoCapture(video_path)
            original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            original_shape = (original_height, original_width)
            cap.release()
            
            if rotation != 0:
                if rotation == 90:
                    original_frame = cv2.rotate(original_frame, cv2.ROTATE_90_CLOCKWISE)
                elif rotation == 180:
                    original_frame = cv2.rotate(original_frame, cv2.ROTATE_180)
                elif rotation == 270:
                    original_frame = cv2.rotate(original_frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            
            # Draw skeleton overlay if pose was detected
            if frame_data.get("pose_detected", False):
                landmarks = frame_data["landmarks"]
                
                # Create overlay with custom styling
                style = {
                    "connection_color": (255, 255, 255),  # White connections
                    "connection_thickness": 2,
                    "landmark_color": (0, 255, 0),  # Green landmarks
                    "landmark_radius": 4,
                    "confidence_based": True
                }
                
                annotated_frame = draw_skeleton_overlay(original_frame, landmarks, style, rotation, original_shape)
                
                # Save test image
                output_path = OUTPUT_DIR / f"overlay_test_frame_{frame_idx}_{analysis_id}.jpg"
                cv2.imwrite(str(output_path), annotated_frame)
                
                logger.info(f"Saved overlay test image: {output_path}")
                
                # Log pose detection info
                confidence = frame_data.get("overall_confidence", 0.0)
                logger.info(f"Frame {frame_idx}: Pose detected with confidence {confidence:.3f}")
            else:
                logger.info(f"Frame {frame_idx}: No pose detected")
        
        logger.info(f"Overlay testing completed for analysis {analysis_id}")
        
    except Exception as e:
        logger.error(f"Error testing overlay rendering: {e}")


def test_overlay_with_existing_data() -> None:
    """
    Test overlay rendering with existing pose data from recent analysis.
    """
    logger.info("Testing overlay rendering with existing pose data")
    
    # Find the most recent pose data file
    pose_files = list(OUTPUT_DIR.glob("pose_data_*.json"))
    if not pose_files:
        logger.error("No pose data files found in output directory")
        return
    
    # Get the most recent file
    most_recent_file = max(pose_files, key=lambda p: p.stat().st_mtime)
    analysis_id = most_recent_file.stem.replace("pose_data_", "")
    
    logger.info(f"Testing with most recent analysis: {analysis_id}")
    
    # Test overlay on sample frames
    test_overlay_on_sample_frames(analysis_id, num_frames=5)


def find_original_video(analysis_id: str) -> str:
    """
    Find the original video file for a given analysis ID.
    
    Args:
        analysis_id: Unique identifier for the analysis
        
    Returns:
        Path to the original video file
        
    Raises:
        FileNotFoundError: If no video file is found
    """
    # Try to find video file by analysis ID (new format: originalname_analysisid.ext)
    upload_dir = Path("backend/static/uploads")
    
    # Look for files that end with the analysis ID
    for video_file in upload_dir.glob("*"):
        if video_file.is_file() and video_file.name.endswith(f"_{analysis_id}.mov"):
            logger.info(f"Found video file: {video_file}")
            return str(video_file)
        elif video_file.is_file() and video_file.name.endswith(f"_{analysis_id}.MOV"):
            logger.info(f"Found video file: {video_file}")
            return str(video_file)
        elif video_file.is_file() and video_file.name.endswith(f"_{analysis_id}.mp4"):
            logger.info(f"Found video file: {video_file}")
            return str(video_file)
    
    # Fallback: try old format (analysis_id.ext)
    for ext in ['.mov', '.MOV', '.mp4', '.avi']:
        potential_path = f"backend/static/uploads/{analysis_id}{ext}"
        if Path(potential_path).exists():
            logger.info(f"Found video file (old format): {potential_path}")
            return potential_path
    
    raise FileNotFoundError(f"No video file found for analysis {analysis_id}")


def detect_iphone_portrait_rotation(video_path: str) -> int:
    """
    Detect if an iPhone portrait video was encoded as landscape and needs rotation.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Rotation angle in degrees (0, 90, 180, 270)
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        # Sample a few frames for analysis
        orientations = {0: 0, 90: 0, 180: 0, 270: 0}
        
        for i in range(3):  # Sample 3 frames
            ret, frame = cap.read()
            if not ret:
                break
                
            # Test each possible rotation
            for angle in [0, 90, 180, 270]:
                if angle == 0:
                    test_frame = frame
                elif angle == 90:
                    test_frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
                elif angle == 180:
                    test_frame = cv2.rotate(frame, cv2.ROTATE_180)
                elif angle == 270:
                    test_frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
                
                # Analyze content distribution
                gray = cv2.cvtColor(test_frame, cv2.COLOR_BGR2GRAY)
                height, width = gray.shape
                
                # Check if content is more concentrated in center (typical for portrait videos)
                center_h_start = height // 4
                center_h_end = 3 * height // 4
                center_w_start = width // 4
                center_w_end = 3 * width // 4
                
                center_region = gray[center_h_start:center_h_end, center_w_start:center_w_end]
                center_brightness = np.mean(center_region)
                
                # Check edge distribution
                edges = cv2.Canny(gray, 50, 150)
                center_edges = edges[center_h_start:center_h_end, center_w_start:center_w_end]
                center_edge_density = np.mean(center_edges > 0)
                
                # Check aspect ratio preference (portrait videos have height > width)
                aspect_ratio = width / height
                
                # Score based on center concentration and aspect ratio
                score = center_edge_density * 1000
                
                # Strong bonus for portrait aspect ratio (height > width)
                if aspect_ratio < 1:  # Portrait
                    score *= 2.0
                
                # Bonus for higher center brightness (more content in center)
                if center_brightness > 80:
                    score *= 1.2
                
                orientations[angle] += score
        
        cap.release()
        
        # Find the orientation with highest score
        best_orientation = max(orientations, key=orientations.get)
        
        # Only return non-zero rotation if there's a significant difference
        max_score = orientations[best_orientation]
        zero_score = orientations[0]
        
        if max_score > zero_score * 1.5:  # 50% better than no rotation
            logger.info(f"iPhone portrait rotation detection: {best_orientation}° (scores: {orientations})")
            return best_orientation
        else:
            logger.info(f"iPhone portrait rotation detection: 0° (no significant difference, scores: {orientations})")
            return 0
        
    except Exception as e:
        logger.warning(f"iPhone portrait rotation detection failed: {str(e)}, defaulting to 0")
        return 0


def detect_video_orientation_heuristic(video_path: str) -> int:
    """
    Detect video orientation using content analysis when metadata is missing.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Rotation angle in degrees (0, 90, 180, 270)
    """
    try:
        cap = cv2.VideoCapture(video_path)
        
        # Sample a few frames for analysis
        orientations = {0: 0, 90: 0, 180: 0, 270: 0}
        
        for i in range(3):  # Sample 3 frames
            ret, frame = cap.read()
            if not ret:
                break
                
            # Analyze each possible orientation
            for angle in [0, 90, 180, 270]:
                if angle == 0:
                    test_frame = frame
                elif angle == 90:
                    test_frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
                elif angle == 180:
                    test_frame = cv2.rotate(frame, cv2.ROTATE_180)
                elif angle == 270:
                    test_frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
                
                # Analyze content distribution
                gray = cv2.cvtColor(test_frame, cv2.COLOR_BGR2GRAY)
                height, width = gray.shape
                
                # Calculate edge density in different regions
                edges = cv2.Canny(gray, 50, 150)
                
                # Check if content is more concentrated in center (typical for vertical videos)
                center_h_start = height // 4
                center_h_end = 3 * height // 4
                center_w_start = width // 4
                center_w_end = 3 * width // 4
                
                center_region = edges[center_h_start:center_h_end, center_w_start:center_w_end]
                center_edge_density = np.mean(center_region > 0)
                
                # Check edge distribution - vertical videos should have more vertical edges
                vertical_edges = np.sum(edges[:, :width//2]) + np.sum(edges[:, width//2:])
                horizontal_edges = np.sum(edges[:height//2, :]) + np.sum(edges[height//2:, :])
                
                # Score based on center concentration and edge distribution
                score = center_edge_density * 1000
                
                # Bonus for portrait aspect ratio (height > width)
                aspect_ratio = width / height
                if aspect_ratio < 1:  # Portrait
                    score *= 1.2
                
                # Bonus for more vertical edge distribution
                if vertical_edges > horizontal_edges * 1.1:
                    score *= 1.1
                
                orientations[angle] += score
        
        cap.release()
        
        # Find the orientation with highest score
        best_orientation = max(orientations, key=orientations.get)
        
        # Only return non-zero rotation if there's a significant difference
        max_score = orientations[best_orientation]
        zero_score = orientations[0]
        
        if max_score > zero_score * 1.3:  # 30% better than no rotation
            logger.info(f"Heuristic orientation detection: {best_orientation}° (scores: {orientations})")
            return best_orientation
        else:
            logger.info(f"Heuristic orientation detection: 0° (no significant difference, scores: {orientations})")
            return 0
        
    except Exception as e:
        logger.warning(f"Heuristic orientation detection failed: {str(e)}, defaulting to 0")
        return 0


def get_video_rotation(video_path: str) -> int:
    """
    Get video rotation from metadata using PyAV.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Rotation angle in degrees (0, 90, 180, 270)
    """
    try:
        import av
        container = av.open(video_path)
        stream = container.streams.video[0]
        rotation = getattr(stream, 'rotation', 0)
        container.close()
        
        # Normalize rotation to 0, 90, 180, 270
        rotation = rotation % 360
        if rotation not in [0, 90, 180, 270]:
            logger.warning(f"Unexpected rotation angle {rotation}, defaulting to 0")
            rotation = 0
            
        # If metadata shows no rotation but video appears vertical, use iPhone-specific detection
        if rotation == 0:
            # First try iPhone-specific detection for portrait videos
            iphone_rotation = detect_iphone_portrait_rotation(video_path)
            if iphone_rotation != 0:
                logger.info(f"Metadata shows 0° but iPhone detection suggests {iphone_rotation}°, using iPhone detection")
                rotation = iphone_rotation
            else:
                # Fall back to general heuristic
                heuristic_rotation = detect_video_orientation_heuristic(video_path)
                if heuristic_rotation != 0:
                    logger.info(f"Metadata shows 0° but heuristic suggests {heuristic_rotation}°, using heuristic")
                    rotation = heuristic_rotation
            
        logger.info(f"Video rotation detected: {rotation} degrees")
        return rotation
        
    except Exception as e:
        logger.warning(f"Failed to detect video rotation: {str(e)}, trying heuristic detection")
        return detect_video_orientation_heuristic(video_path)


def setup_video_writer(analysis_id: str, video_path: str) -> Tuple[cv2.VideoWriter, Dict[str, Any]]:
    """
    Setup OpenCV VideoWriter for overlay video generation.
    
    Args:
        analysis_id: Unique identifier for the analysis
        video_path: Path to the original video file
        
    Returns:
        Tuple of (video_writer, video_properties)
    """
    # Get video properties from original video
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    
    # Get rotation metadata
    rotation = get_video_rotation(video_path)
    
    # Adjust dimensions if rotated
    if rotation in [90, 270]:
        width, height = height, width  # Swap dimensions for rotated videos
        logger.info(f"Video rotated {rotation}°, adjusted dimensions: {width}x{height}")
    
    # Setup output video path with original filename
    original_filename = Path(video_path).stem  # Get filename without extension
    analysis_prefix = analysis_id[:8]  # First 8 characters of analysis ID
    output_path = f"backend/static/outputs/overlay_{original_filename}_{analysis_prefix}.mp4"
    
    # Create video writer with same properties as original (adjusted for rotation)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    if not video_writer.isOpened():
        raise RuntimeError(f"Failed to create video writer for {output_path}")
    
    video_properties = {
        "fps": fps,
        "width": width,
        "height": height,
        "rotation": rotation,
        "output_path": output_path
    }
    
    logger.info(f"Video writer setup: {width}x{height} @ {fps}fps (rotation: {rotation}°) -> {output_path}")
    return video_writer, video_properties


def get_pose_for_frame(pose_data: List[Dict], frame_index: int) -> Optional[Dict]:
    """
    Get pose data for a specific frame index.
    
    Args:
        pose_data: List of pose data dictionaries
        frame_index: Frame index to get pose data for
        
    Returns:
        Pose data dictionary for the frame, or None if not found
    """
    for pose_frame in pose_data:
        if pose_frame.get("frame_index") == frame_index:
            return pose_frame
    return None


def process_video_frames(video_path: str, pose_data: List[Dict], video_writer: cv2.VideoWriter, rotation: int = 0) -> None:
    """
    Process video frames and write overlay video.
    
    Args:
        video_path: Path to the original video file
        pose_data: List of pose data dictionaries
        video_writer: OpenCV VideoWriter for output
        rotation: Rotation angle in degrees (0, 90, 180, 270)
    """
    cap = cv2.VideoCapture(video_path)
    
    # Get original video dimensions
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    original_shape = (original_height, original_width)
    
    frame_index = 0
    frames_processed = 0
    frames_with_overlay = 0
    
    logger.info(f"Starting video frame processing for {len(pose_data)} pose frames (rotation: {rotation}°)")
    logger.info(f"Original video dimensions: {original_width}x{original_height}")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Apply rotation if needed
        if rotation != 0:
            if rotation == 90:
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            elif rotation == 180:
                frame = cv2.rotate(frame, cv2.ROTATE_180)
            elif rotation == 270:
                frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        
        # Get pose data for this frame
        frame_pose_data = get_pose_for_frame(pose_data, frame_index)
        
        if frame_pose_data and frame_pose_data.get("pose_detected", False):
            # Draw skeleton overlay
            landmarks = frame_pose_data.get("landmarks", [])
            if landmarks:
                frame = draw_skeleton_overlay(frame, landmarks, rotation=rotation, original_shape=original_shape)
                frames_with_overlay += 1
        # If no pose data, just use original frame
        
        video_writer.write(frame)
        frames_processed += 1
        frame_index += 1
        
        # Log progress every 50 frames
        if frame_index % 50 == 0:
            logger.info(f"Processed frame {frame_index}, overlay applied to {frames_with_overlay} frames")
    
    cap.release()
    logger.info(f"Video processing completed: {frames_processed} frames processed, {frames_with_overlay} frames with overlay")


def cleanup_video_writer(video_writer: cv2.VideoWriter) -> None:
    """
    Cleanup video writer resources.
    
    Args:
        video_writer: OpenCV VideoWriter to cleanup
    """
    if video_writer:
        video_writer.release()
        logger.info("Video writer cleaned up")


def generate_overlay_video(analysis_id: str) -> str:
    """
    Generate complete overlay video from pose data and original video.
    
    Args:
        analysis_id: Unique identifier for the analysis
        
    Returns:
        Path to the generated overlay video file
        
    Raises:
        FileNotFoundError: If pose data or video file is not found
        RuntimeError: If video generation fails
    """
    logger.info(f"Starting overlay video generation for analysis {analysis_id}")
    
    try:
        # Load pose data
        pose_data_dict = load_pose_data(analysis_id)
        if not pose_data_dict:
            raise FileNotFoundError(f"No pose data found for analysis {analysis_id}")
        
        # Extract frames from pose data
        pose_data = pose_data_dict.get("frames", [])
        if not pose_data:
            raise FileNotFoundError(f"No frame data found in pose data for analysis {analysis_id}")
        
        # Find original video file
        video_path = find_original_video(analysis_id)
        
        # Setup video writer
        video_writer, video_properties = setup_video_writer(analysis_id, video_path)
        
        # Process video frames
        rotation = video_properties.get("rotation", 0)
        process_video_frames(video_path, pose_data, video_writer, rotation)
        
        # Cleanup
        cleanup_video_writer(video_writer)
        
        output_path = video_properties["output_path"]
        logger.info(f"Overlay video generation completed: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Overlay video generation failed for analysis {analysis_id}: {str(e)}")
        raise RuntimeError(f"Overlay video generation failed: {str(e)}")


