# Crux Vision

Crux Vision is a local-first movement-review workspace for climbers. R2A opens
a local portrait or landscape video immediately, lets the user select a short
range, and progressively renders timestamp-synchronized MediaPipe pose and
confidence-aware hip and shoulder midpoint trails without uploading or
re-encoding the source.

Product delivery is tracked in [`ROADMAP.md`](./ROADMAP.md). The current R2
contract is [`docs/r2-product-spec.md`](./docs/r2-product-spec.md), and R2A's
implementation decisions live in
[`docs/r2a-implementation-spec.md`](./docs/r2a-implementation-spec.md). R1
evidence remains in [`docs/r1-spike-report.md`](./docs/r1-spike-report.md) and
[`docs/r1-results`](./docs/r1-results).

## Develop

Requirements: Node.js 22.12 or newer and a current desktop Chrome installation.

```bash
npm install
npm run dev
```

Open the printed local URL and choose a video. The app uses a local `blob:` URL;
the file is not uploaded. MediaPipe's pinned WASM runtime and Lite model are
downloaded when analysis starts, then inference runs in a module worker.

## Verify

```bash
npm test
npm run build
npm run test:e2e
```

Unit tests cover range math, timestamp lookup, confidence gaps, trail
segmentation, session identity, and display transforms. Browser tests use the
fixture manifest at [`tests/fixtures/fixture-manifest.json`](./tests/fixtures/fixture-manifest.json).
By default, media fixtures are read from
`/Users/evan/crux-vision-legacy/backend/static/originals`; set
`CRUX_FIXTURE_ROOT` to use another local fixture directory.

## Architecture invariants

- Video remains the source; pose is raw timestamped data; overlays are live
  Canvas views.
- Pose is joined to playback by presentation timestamp, never only frame index.
- Image landmarks are normalized in upright displayed-video space.
- Video and every overlay share the same display transform.
- Missing or low-confidence joints break skeletons and trails instead of being
  silently connected.
- Replacing a source cancels analysis and releases its worker, adapter, object
  URL, media element, and stale results.
- There is no upload, account, cloud persistence, baked overlay video, MoveNet,
  or TensorFlow product path.

## Phone validation

Desktop responsive emulation is part of automated and visual R2A verification,
but it does not replace the physical gate. After R2A, follow the short smoke
test in [`docs/iphone-test-guide.md`](./docs/iphone-test-guide.md) on the iPhone
15 using Chrome/iOS WebKit before beginning R2B.

The archived 2025 implementation and private evaluation corpus remain at
`/Users/evan/crux-vision-legacy`; they are references, not code to extend or
media to copy into this repository.
