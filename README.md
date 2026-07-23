# Crux Vision

Crux Vision is being rebuilt as a local-first, mobile-capable movement-analysis
workspace for climbers. The first useful release will combine precise video
review with progressive on-device pose, a live skeleton, and selectable joint
trails; confidence-aware analytics and comparison will build on that core.

R1's desktop media/pose spike is complete. See the standalone
[`ROADMAP.md`](./ROADMAP.md), the [rebuild report](./docs/rebuild-report.md), and
the [R1 spike report](./docs/r1-spike-report.md). R2's implementation contract is
in [`docs/r2-product-spec.md`](./docs/r2-product-spec.md).

Physical-device validation is split between an early R2 smoke test and a later
full evaluation in [`docs/iphone-test-guide.md`](./docs/iphone-test-guide.md).

## Run the R1 diagnostic

```bash
npm install
npm run dev
```

Open the local URL, choose a video, select a model/delegate and range, then run
the benchmark. The video remains local. Automated checks and the repeatable
desktop model matrix are:

```bash
npm test
npm run test:e2e
npm run benchmark:desktop
```

The benchmark expects the legacy fixture folder at
`/Users/evan/crux-vision-legacy/backend/static/originals`. Set
`CRUX_FIXTURE_ROOT` to override it.

## Current decisions

- Start with one-video analysis: a genuinely good player plus pose, skeleton,
  and selectable joint trails in the first user-visible milestone.
- Use an iPhone 15 running iOS 26.5 with Chrome as the primary gym reference
  device; test the underlying iOS/WebKit behavior on that physical phone.
- Add two-video comparison after the single-player core is proven.
- Keep the source video separate from pose data and derived analysis.
- Render overlays live so every layer can be toggled or restyled instantly.
- Use display-oriented, timestamped coordinates; never infer orientation from
  width and height.
- Treat confidence and metric coverage as first-class data.
- Keep v1 sessions local; defer accounts, cloud sync, and sharing.
- Keep experimental climbing metrics clearly separated from reliable measures.
- Do not add accounts, cloud storage, LLM coaching, or baked video export until
  the core review loop is valuable.

## Historical implementation

The archived fall 2025 implementation and its Git history live at
`/Users/evan/crux-vision-legacy`. It is reference material, not a codebase to
extend.
