# Crux Vision rebuild agent instructions

Read `docs/rebuild-report.md` before changing product scope or architecture.

## Project boundary

- This is a clean rebuild. Do not copy implementation code from
  `/Users/evan/crux-vision-legacy` without a specific, documented reason.
- The legacy videos are an evaluation corpus. Do not copy the full corpus into
  this Git repository; select small fixtures or use external/LFS storage later.
- Keep this project in its own Git repository.
- The primary capture and test device is an iPhone 15 running iOS 26.5, with
  Chrome as the user's preferred browser. Treat this as a WebKit/iOS target and
  verify behavior on the physical phone.
- ClimbingCap and AscendMotion are parked research references, not dependencies,
  implementation targets, or roadmap items. Do not download their data, adapt
  their architecture, map their joints, train on them, or investigate them
  further unless the user explicitly reopens that work.

## Non-negotiable media invariants

- Pose samples are timestamped, never joined to video solely by frame index.
- All image-space landmarks use normalized coordinates in the displayed,
  upright video coordinate system.
- Preserve the source display transform (rotation and flip) explicitly.
- Apply the same fit/crop/zoom transform to video and overlays.
- Never bake overlays into a second video for normal playback.
- Transcoding is a compatibility fallback, not the analysis workflow.

## Product order

1. Short internal media/pose risk spike on the reference laptop and iPhone.
2. First useful vertical slice: single-video player, progressive pose, live
   skeleton, and selectable joint trails.
3. Confidence-aware overlays and analysis ranges.
4. Trustworthy segment analytics.
5. Two-video synchronized comparison.
6. Experimental climbing-specific signals.
7. Persistence, sharing, and coaching only after validation.

## Analysis integrity

- Retain raw pose output separately from filtered and derived data.
- Report valid-data coverage with every metric.
- Do not silently bridge long gaps or include low-confidence joints in stats.
- Label kinematic proxies as proxies; do not claim force, strength, metabolic
  efficiency, injury risk, or balance without the measurements needed to
  support those claims.
- Prefer user-correctable suggestions over opaque automatic classifications.

## Development approach

- Build every milestone as a user-testable vertical slice.
- Maintain a small orientation/codec/frame-rate fixture matrix from the start.
- Put browser/media/model integrations behind narrow adapters so they can be
  replaced after benchmarks.
- Pin exact dependency versions in the lockfile and record model asset versions.
- Test timing logic with presentation timestamps and variable-frame-rate clips.
