# Future commercialization notes

**Status:** Research note only. Commercialization is not current product scope.

Crux Vision currently runs MediaPipe Pose Landmarker in the browser. The
browser downloads the version-pinned MediaPipe WebAssembly runtime and pose
model, then performs inference locally in a Web Worker on the user's CPU or
GPU. Imported video is not uploaded for pose analysis.

This architecture has no per-frame MediaPipe API fee. MediaPipe and the
BlazePose GHUM Lite, Full, and Heavy model variants are published under the
Apache License 2.0, which permits commercial use and redistribution subject to
the license's notice and attribution requirements. It does not grant permission
to imply Google endorsement or use Google trademarks beyond customary
attribution.

At meaningful public scale, the primary MediaPipe concerns would be:

- device performance, battery use, heat, browser stability, and model-download
  time rather than server inference cost;
- reliance on Google Storage and jsDelivr for production model/runtime
  downloads;
- version pinning, caching, availability, and third-party license notices; and
- privacy disclosure. Google's current MediaPipe notice says input processing
  occurs on-device, but MediaPipe Tasks may send performance and utilization
  metrics to Google, with consent obligations where applicable.

Before a public launch, Crux should audit browser network traffic, maintain a
third-party notices inventory, review the applicable licenses with counsel, and
consider self-hosting pinned copies of the model and WebAssembly runtime. A
server-side analysis product would have materially different storage, compute,
bandwidth, deletion, security, and privacy costs; it is not implied by the
current architecture.

## Possible future business approach

The initial public product would remain free while product value and demand are
being established. Monetization would be considered only if adoption creates a
clear opportunity or operating scale requires sustainable funding.

Possible later options include:

- advertising that does not compromise the review experience or video privacy;
- a premium tier for exports or downloadable rendered videos;
- premium advanced settings and workflow conveniences; and
- premium analytics once those analytics are validated and genuinely useful.

Core confidence filtering, honest uncertainty, basic pose review, and essential
privacy protections should not be degraded or hidden to manufacture a paid
tier. Exact packaging, pricing, accounts, payments, advertising, cloud storage,
and server processing all remain future decisions.

## Sources

- [MediaPipe project and privacy notice](https://github.com/google-ai-edge/mediapipe)
- [MediaPipe Apache License 2.0](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)
- [BlazePose GHUM 3D model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf)
- [Pose Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
