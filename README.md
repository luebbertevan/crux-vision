# Crux Vision

Crux Vision is being rebuilt as a local-first, mobile-capable movement-analysis
workspace for climbers. The first useful release will combine precise video
review with progressive on-device pose, a live skeleton, and selectable joint
trails; confidence-aware analytics and comparison will build on that core.

No application code has been written in this repository yet. The product and
technical direction is documented in
[the rebuild report](./docs/rebuild-report.md).

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
