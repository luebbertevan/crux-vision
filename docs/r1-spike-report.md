# R1 media and pose spike

**Status:** Desktop evidence collected; physical iPhone pass pending

**Reference laptop:** Apple M3, 16 GB

**Reference phone:** iPhone 15, iOS 26.5, Chrome/iOS WebKit

## What the harness proves

The R1 harness is intentionally diagnostic rather than production UI. It:

- opens a local video without upload;
- uses MediaBunny 1.51.0 to inspect container metadata and extract selected
  presentation timestamps;
- applies the source display rotation before inference through `CanvasSink`;
- transfers display-oriented `ImageBitmap` frames to a module worker;
- runs pinned MediaPipe Tasks 0.10.35 Lite, Full, or Heavy models on CPU or GPU;
- stores results by integer presentation timestamp rather than frame index;
- draws a live Canvas skeleton over ordinary video playback;
- runs MoveNet Lightning as a 17-keypoint comparison baseline;
- reports pose coverage, important-joint visibility coverage, possible large
  jumps, load time, extraction time, inference time, and wall time;
- downloads the diagnostic result as JSON for the physical-phone test.

No overlay video is generated and no legacy implementation code was copied.

## Orientation result

Automated Chrome tests passed for both difficult legacy fixtures:

| Fixture | Coded pixels | Display rotation | Displayed pixels | Result |
|---|---:|---:|---:|---|
| `portrait-test.MOV` | 1920×1080 | 90° clockwise | 1080×1920 | Passed |
| `landscape-test.MOV` | 1920×1080 | 180° clockwise | 1920×1080 | Passed |

Chrome's video element and MediaBunny independently reported the same displayed
dimensions for the portrait fixture. This is the coordinate contract the legacy
app lacked. The overlay consumes the same normalized, upright coordinate space.

## Desktop benchmark

The checked-in raw result is
[`spike-results/desktop-chrome-m3.json`](./spike-results/desktop-chrome-m3.json).
It used Chrome 150 headless, `lache-send.MOV`, seconds 7–12, and 15 requested
samples per second. All 76 requested samples completed for every model.

| Model | Execution | Mean inference | Inference throughput | Pose coverage |
|---|---|---:|---:|---:|
| MediaPipe Lite | Worker / CPU | 15.8 ms | 63.2 fps | 67.1% |
| MediaPipe Lite | Worker / GPU | 13.7 ms | 73.1 fps | 64.5% |
| MediaPipe Full | Worker / CPU | 20.6 ms | 48.6 fps | 67.1% |
| MediaPipe Full | Worker / GPU | 15.9 ms | 62.8 fps | 65.8% |
| MediaPipe Heavy | Worker / CPU | 61.6 ms | 16.2 fps | 67.1% |
| MediaPipe Heavy | Worker / GPU | 20.6 ms | 48.6 fps | 67.1% |
| MoveNet Lightning | Main thread / WebGL | 16.2 ms | 61.9 fps | 65.8% |

Load-time numbers are recorded in the JSON but should not be compared directly:
the sequential run warms browser, model, and CDN caches. GPU results from
headless Chrome also do not establish physical hardware performance.

## Early findings

1. **The client-side architecture is viable on the laptop.** MediaPipe Lite and
   Full both process substantially faster than the requested 15 fps while
   remaining off the main UI thread.
2. **Media decoding is no longer the bottleneck.** Display-oriented extraction
   totaled roughly 26–36 ms across 76 MediaPipe samples.
3. **Heavy has not earned its cost.** It produced no better pose-presence
   coverage on this range, ran at only 16.4 fps on CPU, and had worse accepted
   ankle coverage than Lite/Full at the current 0.5 threshold.
4. **Lite is the provisional mobile default; Full remains the quality
   challenger.** This must be confirmed on the iPhone and on more occluded
   climbing ranges before the R1 exit decision.
5. **MoveNet is a useful speed baseline, not the preferred product model.** It
   was fast, but it has 17 points rather than MediaPipe's 33 and showed lower
   accepted coverage for wrists and ankles in this sample. It currently runs on
   the main thread in the comparison harness, which is not acceptable for the
   product playback path.
6. **Per-joint confidence is essential.** Across all MediaPipe variants, one
   wrist had almost no accepted coverage while shoulders and hips were stable.
   A single global confidence threshold would either show bad wrist data or hide
   good torso data.
7. **Module-worker integration is proven.** MediaPipe's ESM WASM loader must be
   requested explicitly inside a module worker; using its classic loader fails
   with `ModuleFactory not set`.
8. **Letterboxing is now part of the tested coordinate contract.** The first
   visual capture exposed a correctly upright pose drawn against the whole
   player rather than the portrait video's contained image rectangle. The
   renderer now maps landmarks through the same `object-fit: contain` rectangle
   as the video. The corrected evidence image is
   [`spike-results/desktop-overlay-lite.png`](./spike-results/desktop-overlay-lite.png).

## Limits of this evidence

- Pose coverage means that the model returned landmarks; it is not ground-truth
  joint accuracy.
- The large-jump heuristic found no candidates above 0.18 normalized image
  units between accepted consecutive samples, but that threshold is only a
  diagnostic and can miss smaller slingshots.
- Only one dynamic range was used for the complete model matrix.
- Battery, heat, memory pressure, backgrounding, and real iOS WebKit behavior
  remain unmeasured.
- The optional MoveNet comparison is lazy-loaded, but its separate diagnostic
  chunk is intentionally too large for production and should not ship with the
  product player.

## Remaining R1 work

1. Serve the harness from a trusted HTTPS origin and run it on the physical
   iPhone 15 in Chrome.
2. Import an actual recent gym video from the phone photo library.
3. Run Lite/CPU, Lite/GPU, Full/CPU, and Full/GPU for a five-second range at
   15 fps, then download each diagnostic JSON file.
4. Repeat a longer 20–30 second Lite run to observe heat, battery, UI
   responsiveness, and sustained throughput.
5. Visually inspect skeleton alignment at portrait playback timestamps and note
   wrist/ankle failures.
6. Choose the default model/delegate and document the client-only/fallback exit
   decision.

The repeatable checklist is in
[`iphone-test-guide.md`](./iphone-test-guide.md).

R1 is not complete until the physical iPhone evidence exists. The desktop result
is strong enough to continue the architecture, but not strong enough to claim
mobile viability yet.
