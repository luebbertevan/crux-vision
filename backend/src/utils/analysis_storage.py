"""
Analysis status tracking for M3c.

This module provides simple in-memory storage for tracking analysis status
and results. For MVP, we use in-memory storage; this can be replaced with
a database in future iterations.
"""

from typing import Dict, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# In-memory storage for analysis status and results
# In production, this would be replaced with a database
analysis_storage: Dict[str, Dict[str, Any]] = {}


def create_analysis_record(analysis_id: str) -> None:
    """
    Create a new analysis record with initial status.
    
    Args:
        analysis_id: Unique identifier for the analysis
    """
    analysis_storage[analysis_id] = {
        "id": analysis_id,
        "status": "processing",
        "created_at": datetime.now().isoformat(),
        "metrics": None,
        "feedback": None,
        "video_url": None,
        "error_message": None,
        "pose_data": None,
        "processing_info": None
    }
    logger.info(f"Created analysis record for {analysis_id}")


def update_analysis_status(analysis_id: str, status: str, error_message: Optional[str] = None) -> None:
    """
    Update the status of an analysis.
    
    Args:
        analysis_id: Unique identifier for the analysis
        status: New status ("processing", "complete", "error")
        error_message: Error message if status is "error"
    """
    if analysis_id in analysis_storage:
        analysis_storage[analysis_id]["status"] = status
        if error_message:
            analysis_storage[analysis_id]["error_message"] = error_message
        logger.info(f"Updated analysis {analysis_id} status to {status}")
    else:
        logger.warning(f"Analysis {analysis_id} not found in storage")


def update_analysis_results(analysis_id: str, pose_data: Dict[str, Any], processing_info: Dict[str, Any]) -> None:
    """
    Update analysis with pose detection results.
    
    Args:
        analysis_id: Unique identifier for the analysis
        pose_data: Pose detection results
        processing_info: Processing statistics
    """
    if analysis_id in analysis_storage:
        analysis_storage[analysis_id]["pose_data"] = pose_data
        analysis_storage[analysis_id]["processing_info"] = processing_info
        analysis_storage[analysis_id]["status"] = "complete"
        logger.info(f"Updated analysis {analysis_id} with pose data")
    else:
        logger.warning(f"Analysis {analysis_id} not found in storage")


def get_analysis_record(analysis_id: str) -> Optional[Dict[str, Any]]:
    """
    Get analysis record by ID.
    
    Args:
        analysis_id: Unique identifier for the analysis
        
    Returns:
        Analysis record or None if not found
    """
    return analysis_storage.get(analysis_id)


def cleanup_old_analyses(max_age_hours: int = 24) -> None:
    """
    Clean up old analysis records to prevent memory leaks.
    
    Args:
        max_age_hours: Maximum age in hours before cleanup
    """
    current_time = datetime.now()
    to_remove = []
    
    for analysis_id, record in analysis_storage.items():
        created_at = datetime.fromisoformat(record["created_at"])
        age_hours = (current_time - created_at).total_seconds() / 3600
        
        if age_hours > max_age_hours:
            to_remove.append(analysis_id)
    
    for analysis_id in to_remove:
        del analysis_storage[analysis_id]
        logger.info(f"Cleaned up old analysis {analysis_id}")
    
    if to_remove:
        logger.info(f"Cleaned up {len(to_remove)} old analysis records")
