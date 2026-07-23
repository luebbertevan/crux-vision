# R1 iPhone validation guide

The physical-device pass is the final R1 gate. Use the reference iPhone 15 on
iOS 26.5 in Chrome. Chrome on iOS uses Apple's WebKit engine, so this test is
evidence for the actual browser environment—not desktop Chrome with a narrow
viewport.

## Before testing

- Serve the built app from a trusted HTTPS origin. A local `http://` address is
  not sufficient because browser media APIs can require a secure context.
- Keep the phone off Low Power Mode and record its approximate battery level.
- Use a recent portrait gym video from Photos. The file never leaves the
  browser unless the tester explicitly shares the downloaded diagnostic JSON.
- Close unusually heavy background apps so the first run is comparable. The
  later sustained run should represent normal gym use.

## Short model matrix

Choose a five-second interval where the full climber is visible. Set 15
samples/sec and run:

1. MediaPipe Lite / CPU
2. MediaPipe Lite / GPU
3. MediaPipe Full / CPU
4. MediaPipe Full / GPU

After every run:

- scrub through the interval and check whether the skeleton stays aligned;
- note whether scrolling, controls, or video playback become unresponsive;
- download the diagnostic JSON using a name that identifies the model and
  delegate;
- note obvious wrist or ankle loss and any lines jumping across the image.

## Sustained run

Run Lite with the better delegate over 20–30 seconds at 15 samples/sec. Record:

- wall time and average inference time;
- whether the browser becomes warm or reloads the page;
- whether playback and scrubbing remain responsive after analysis;
- approximate battery percentage before and after;
- whether importing another video and rerunning releases the previous session.

## R1 exit decision

R1 passes if portrait import, display orientation, frame extraction, pose
inference, and live overlay all work without a browser crash; the skeleton is
registered to the displayed video; and Lite processes at a practical rate on
the reference phone. Full remains a candidate only if its visible quality gain
justifies its latency and thermal cost. If neither local path is practical, the
fallback decision must be documented before product UI work begins.
