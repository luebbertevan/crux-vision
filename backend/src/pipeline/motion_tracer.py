"""
Motion tracer module for CruxVision.

This module handles tracking and rendering motion trails for pose landmarks,
specifically designed for visualizing movement paths in climbing videos.
"""

import logging
from typing import List, Tuple, Optional, Dict, Any

# Configure logging
logger = logging.getLogger(__name__)


class MotionTracer:
    """
    Tracks motion trails for pose landmarks over time.
    
    Stores position history with frame indices and provides frame-rate-aware
    persistence for consistent trail duration across different video frame rates.
    """
    
    def __init__(self, fps: float, persistence_seconds: float = 2.0):
        """
        Initialize motion tracer.
        
        Args:
            fps: Video frame rate (frames per second)
            persistence_seconds: How long trails should persist (in seconds)
        """
        self.fps = fps
        self.persistence_seconds = persistence_seconds
        self.max_age_frames = int(fps * persistence_seconds)
        
        # Store position history as list of (x, y, frame_index) tuples
        self.position_history: List[Tuple[float, float, int]] = []
        
        logger.info(f"MotionTracer initialized: {fps}fps, {persistence_seconds}s persistence ({self.max_age_frames} frames)")
    
    def calculate_hip_midpoint(self, landmarks_json: List[Dict], image_shape: Tuple[int, int, int]) -> Optional[Tuple[float, float]]:
        """
        Calculate hip midpoint anchor from MediaPipe landmarks.
        
        Args:
            landmarks_json: List of landmark data from JSON
            image_shape: Image dimensions (height, width, channels)
            
        Returns:
            (x, y) pixel coordinates of hip midpoint, or None if calculation fails
        """
        try:
            # MediaPipe pose landmarks: left_hip (23), right_hip (24)
            left_hip_idx = 23
            right_hip_idx = 24
            
            if len(landmarks_json) <= max(left_hip_idx, right_hip_idx):
                logger.warning("Not enough landmarks for hip midpoint calculation")
                return None
            
            left_hip = landmarks_json[left_hip_idx]
            right_hip = landmarks_json[right_hip_idx]
            
            # Check confidence of both hips
            left_confidence = left_hip.get("visibility", 0.0)
            right_confidence = right_hip.get("visibility", 0.0)
            
            logger.debug(f"Hip confidence: left={left_confidence:.2f}, right={right_confidence:.2f}")
            
            if left_confidence < 0.3 or right_confidence < 0.3:
                logger.debug(f"Hip confidence too low: left={left_confidence:.2f}, right={right_confidence:.2f}")
                return None
            
            # Calculate midpoint in normalized coordinates
            mid_x = (left_hip["x"] + right_hip["x"]) / 2
            mid_y = (left_hip["y"] + right_hip["y"]) / 2
            
            # Convert to pixel coordinates
            pixel_x = int(mid_x * image_shape[1])
            pixel_y = int(mid_y * image_shape[0])
            
            # Check if coordinates are within image bounds
            if 0 <= pixel_x < image_shape[1] and 0 <= pixel_y < image_shape[0]:
                return (pixel_x, pixel_y)
            else:
                logger.debug(f"Hip midpoint out of bounds: ({pixel_x}, {pixel_y})")
                return None
                
        except (KeyError, IndexError, TypeError) as e:
            logger.warning(f"Error calculating hip midpoint: {e}")
            return None
    
    def add_position(self, x: float, y: float, frame_index: int) -> None:
        """
        Add a new position to the trail history.
        
        Args:
            x: X coordinate in pixels
            y: Y coordinate in pixels
            frame_index: Current frame index
        """
        self.position_history.append((x, y, frame_index))
        
        # Clean up old positions outside persistence window
        current_frame = frame_index
        self.position_history = [
            (px, py, fi) for px, py, fi in self.position_history
            if (current_frame - fi) <= self.max_age_frames
        ]
    
    def get_active_trail(self, current_frame_index: int) -> List[Tuple[float, float, int]]:
        """
        Get positions that are still within the persistence window.
        
        Args:
            current_frame_index: Current frame index
            
        Returns:
            List of (x, y, frame_index) tuples within persistence window
        """
        return [
            (x, y, fi) for x, y, fi in self.position_history
            if (current_frame_index - fi) <= self.max_age_frames
        ]
    
    def get_fade_opacity(self, frame_age: int) -> float:
        """
        Calculate fade opacity based on frame age.
        
        Args:
            frame_age: Number of frames since position was recorded
            
        Returns:
            Opacity value between 0.0 (fully transparent) and 1.0 (fully opaque)
        """
        if frame_age >= self.max_age_frames:
            return 0.0
        
        # Linear fade: opacity decreases linearly with age
        opacity = 1.0 - (frame_age / self.max_age_frames)
        return max(0.0, opacity)
    
    def get_current_anchor_position(self) -> Optional[Tuple[float, float]]:
        """
        Get the most recent anchor position.
        
        Returns:
            (x, y) coordinates of the most recent position, or None if no history
        """
        if not self.position_history:
            return None
        
        # Return the most recent position
        return self.position_history[-1][:2]
