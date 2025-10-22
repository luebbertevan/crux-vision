# CruxVision Testing Strategy

## Overview

This document outlines our testing strategy for CruxVision MVP.

## Testing Philosophy

-   **Keep it simple**: Avoid complex error handling that introduces bugs
-   **Occlusion is normal**: Don't discard frames with low confidence poses
-   **Incremental testing**: Test each milestone thoroughly before moving to the next
-   **Real-world validation**: Use actual climbing videos for testing

## Quick Test Commands

```bash
# Test pose detection
python backend/src/pipeline/pose_detection.py

# Test overlay rendering
python backend/src/pipeline/overlay.py

# Test API
curl -X GET "http://localhost:8000/api/ping"
curl -X POST "http://localhost:8000/api/analyze" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@backend/static/uploads/pose-test.MOV"

# Check outputs
ls backend/static/outputs/
```

## Landmark-Specific Thresholds

### Confidence Levels:

```python
CONFIDENCE_LEVELS = {
    "high": 0.7,      # Reliable for analysis
    "medium": 0.3,    # Use with caution
    "low": 0.1        # Flag but keep
}
```

### Landmark Thresholds:

```python
LANDMARK_THRESHOLDS = {
    "shoulders": 0.5,    # Important for stability analysis
    "hips": 0.4,         # Critical for center of mass
    "hands": 0.1,        # Often occluded - keep everything
    "feet": 0.1,         # Often occluded - keep everything
    "elbows": 0.3,       # Important for technique
    "knees": 0.3         # Important for technique
}
```

## Error Handling Strategy

### What We DO:

-   ✅ **Keep all frames** - even with low confidence
-   ✅ **Flag confidence levels** - for analysis awareness
-   ✅ **Track occlusion flags** - simple boolean flags
-   ✅ **Focus on climbing-relevant landmarks** - shoulders, hips, limbs
-   ✅ **Simple error handling** - log warnings, don't crash

### What We DON'T DO (Avoid Complexity):

-   ❌ **No interpolation/estimation** - too error-prone
-   ❌ **No temporal smoothing** - adds bugs
-   ❌ **No complex fallback logic** - keep it simple
-   ❌ **No face pose tracking** - always occluded in climbing
-   ❌ **No frame discarding** - occlusion is normal

## Success Metrics

-   ✅ Pose detection works on 90%+ of frames
-   ✅ Confidence tracking provides meaningful data
-   ✅ Error handling doesn't crash the system
-   ✅ Processing time is acceptable (<2 minutes for 60s video)
-   ✅ Memory usage stays within limits

## Key Principles

1. **Simplicity over complexity**: Avoid over-engineering error handling
2. **Real-world testing**: Use actual climbing videos
3. **Incremental validation**: Test each component thoroughly
4. **Documentation**: Keep testing strategy updated

---

