# CruxVision Testing Strategy

## Overview

This document outlines our testing strategy for CruxVision MVP, focusing on M3b (MediaPipe Integration) and beyond.

## Testing Philosophy

-   **Keep it simple**: Avoid complex error handling that introduces bugs
-   **Occlusion is normal**: Don't discard frames with low confidence poses
-   **Incremental testing**: Test each milestone thoroughly before moving to the next
-   **Real-world validation**: Use actual climbing videos for testing

## M3b Testing Strategy (MediaPipe Integration)

### Phase 1: Preliminary Testing

**Using existing `pose-test.MOV`**

#### Test Objectives:

1. **Basic MediaPipe Integration**

    - Verify MediaPipe pose detection works
    - Test pose detection on sampled frames
    - Ensure no crashes or errors

2. **Simple Confidence Tracking**

    - Track confidence levels for each landmark
    - Log confidence statistics
    - Verify error handling works gracefully

3. **Output Validation**

    - Check JSON output structure
    - Verify pose data is reasonable
    - Test with different confidence thresholds

#### Test Commands:

```bash
# Test M3b implementation
python backend/src/pipeline/process.py

# Test API integration
curl -X POST "http://localhost:8000/api/analyze" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@backend/static/uploads/pose-test.MOV"

# Check output files
ls backend/static/outputs/
cat backend/static/outputs/pose_data_*.json
```

#### Success Criteria:

-   ✅ MediaPipe integration works
-   ✅ Pose detection runs without crashing
-   ✅ Confidence tracking works
-   ✅ JSON output is generated
-   ✅ Error handling doesn't crash

### Phase 2: Extended Testing (When More Videos Available)

**Test cases to collect:**

#### 1. Good Quality Video

-   **Description**: Clear view of climber, good lighting
-   **Expected**: High confidence poses (>70%)
-   **Test**: Verify landmark detection accuracy

#### 2. Occluded Video

-   **Description**: Hands/feet frequently hidden behind body
-   **Expected**: Low confidence for occluded parts (<30%), but still detects poses
-   **Test**: Verify occlusion handling works

#### 3. Poor Lighting Video

-   **Description**: Shadows, backlighting, indoor gym conditions
-   **Expected**: Lower overall confidence (30-50%)
-   **Test**: Verify system handles lighting variations

#### 4. Edge Cases

-   **Very short video**: <5 seconds
-   **Very long video**: >60 seconds
-   **Invalid file format**: Non-video files
-   **No people**: Landscape videos

### Phase 3: Performance Testing

-   **Processing time**: Should complete within reasonable time
-   **Memory usage**: Monitor for memory leaks
-   **Frame limits**: Verify 2000 frame safety limit works
-   **Concurrent uploads**: Test multiple simultaneous uploads

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

### Why Different Thresholds:

-   **Hands/Feet**: Often occluded in climbing (behind body, against wall) → Lower threshold
-   **Shoulders/Hips**: More visible, critical for stability analysis → Higher threshold
-   **Elbows/Knees**: Important for technique, moderately visible → Medium threshold

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

## Test Data Requirements

### Current Test Data:

-   **pose-test.MOV**: Baseline test video (already available)

### Additional Test Data Needed:

1. **Good quality climbing video** (clear view, good lighting)
2. **Occluded climbing video** (hands/feet frequently hidden)
3. **Poor lighting video** (shadows, backlighting)
4. **Edge case videos** (very short, very long, invalid format)

### Test Data Collection Plan:

-   **Today**: Use existing `pose-test.MOV` for preliminary testing
-   **This week**: Collect 2-3 additional test videos
-   **Ongoing**: Add more test cases as they become available

## Testing Workflow

### 1. Automated Testing

```bash
# Run basic tests
python backend/src/pipeline/process.py

# Check for errors
grep -i error backend/static/outputs/*.txt
```

### 2. Manual Testing

-   Upload videos via API
-   Check pose detection results
-   Verify confidence levels make sense
-   Test error handling with edge cases

### 3. Validation Testing

-   Compare pose detection results with expected outcomes
-   Verify landmark positions are reasonable
-   Check confidence scores align with video quality

## Future Testing (Post-MVP)

### Advanced Error Handling:

-   Interpolation for missing poses
-   Temporal smoothing
-   Complex confidence analysis
-   Advanced occlusion detection

### Performance Optimization:

-   Adaptive frame sampling
-   GPU acceleration
-   Parallel processing
-   Caching strategies

### Extended Test Cases:

-   Multiple climbers in video
-   Different climbing styles (bouldering, sport, trad)
-   Various camera angles
-   Different lighting conditions

## Test Documentation

### Test Results Format:

```json
{
	"test_name": "pose_detection_baseline",
	"video_file": "pose-test.MOV",
	"test_date": "2024-01-XX",
	"results": {
		"frames_processed": 1200,
		"poses_detected": 1150,
		"avg_confidence": 0.65,
		"processing_time": "45.2s",
		"status": "success"
	},
	"issues": [],
	"notes": "Good baseline performance"
}
```

### Test Logging:

-   Log all test runs with timestamps
-   Record processing times and memory usage
-   Document any errors or warnings
-   Track confidence score distributions

## Success Metrics

### M3b Success Criteria:

-   ✅ Pose detection works on 90%+ of frames
-   ✅ Confidence tracking provides meaningful data
-   ✅ Error handling doesn't crash the system
-   ✅ Processing time is acceptable (<2 minutes for 60s video)
-   ✅ Memory usage stays within limits

### Overall MVP Success Criteria:

-   ✅ Handles typical climbing videos reliably
-   ✅ Provides useful pose data for analysis
-   ✅ Graceful error handling for edge cases
-   ✅ Performance suitable for real-world use

## Key Principles

1. **Simplicity over complexity**: Avoid over-engineering error handling
2. **Real-world testing**: Use actual climbing videos
3. **Incremental validation**: Test each component thoroughly
4. **Documentation**: Keep testing strategy updated

## Risk Mitigation

-   Start with simple implementations
-   Test thoroughly before adding complexity
-   Keep fallback options for edge cases
-   Document all assumptions and limitations

---

_Last updated: [Current Date]_
_Next review: After M3b implementation_
