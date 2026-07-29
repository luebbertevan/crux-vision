export type PlayerSnapshot = {
  currentTimeSeconds: number;
  durationSeconds: number;
  playing: boolean;
  ready: boolean;
  playbackRate: number;
  muted: boolean;
};

const EMPTY_SNAPSHOT: PlayerSnapshot = {
  currentTimeSeconds: 0,
  durationSeconds: 0,
  playing: false,
  ready: false,
  playbackRate: 1,
  muted: true,
};

export class PlayerController {
  private video: HTMLVideoElement | null = null;
  private snapshot = EMPTY_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private loopRangeSeconds: { start: number; end: number } | null = null;
  private videoFrameCallbackId: number | null = null;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = () => this.snapshot;

  attach(video: HTMLVideoElement | null): void {
    if (this.video === video) return;
    this.removeListeners();
    this.video = video;
    if (this.video) this.video.muted = true;
    this.addListeners();
    this.publish();
  }

  async togglePlayback(): Promise<void> {
    if (!this.video) return;
    if (this.video.paused) {
      this.restartAtLoopStartWhenOutside();
      await this.video.play();
    }
    else this.video.pause();
  }

  seek(seconds: number): void {
    if (!this.video) return;
    const duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
    this.video.currentTime = Math.min(duration, Math.max(0, seconds));
    this.publish();
  }

  pause(): void {
    this.video?.pause();
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    if (this.video) this.video.playbackRate = Math.min(4, Math.max(0.1, rate));
    this.publish();
  }

  setMuted(muted: boolean): void {
    if (this.video) this.video.muted = muted;
    this.publish();
  }

  toggleMuted(): void {
    if (!this.video) return;
    this.video.muted = !this.video.muted;
    this.publish();
  }

  setLoopRange(range: { start: number; end: number } | null): void {
    this.loopRangeSeconds =
      range && Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start
        ? {
            start: Math.max(0, range.start),
            end: Math.max(0, range.end),
          }
        : null;
    if (this.loopRangeSeconds) this.scheduleLoopCheck();
    else this.cancelLoopCheck();
  }

  destroy(): void {
    this.removeListeners();
    this.video = null;
    this.loopRangeSeconds = null;
    this.snapshot = EMPTY_SNAPSHOT;
    this.listeners.clear();
  }

  private readonly publish = () => {
    const video = this.video;
    const next = video
      ? {
          currentTimeSeconds: Number.isFinite(video.currentTime) ? video.currentTime : 0,
          durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
          playing: !video.paused && !video.ended,
          ready: video.readyState >= HTMLMediaElement.HAVE_METADATA,
          playbackRate: Number.isFinite(video.playbackRate) ? video.playbackRate : 1,
          muted: video.muted,
        }
      : EMPTY_SNAPSHOT;
    if (
      next.currentTimeSeconds === this.snapshot.currentTimeSeconds &&
      next.durationSeconds === this.snapshot.durationSeconds &&
      next.playing === this.snapshot.playing &&
      next.ready === this.snapshot.ready &&
      next.playbackRate === this.snapshot.playbackRate &&
      next.muted === this.snapshot.muted
    ) {
      if (next.playing) this.scheduleLoopCheck();
      else this.cancelLoopCheck();
      return;
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener();
    if (next.playing) this.scheduleLoopCheck();
    else this.cancelLoopCheck();
  };

  private readonly handleMediaEvent = () => {
    this.enforceLoopBoundary();
    this.publish();
  };

  private restartAtLoopStartWhenOutside(): void {
    const video = this.video;
    const range = this.loopRangeSeconds;
    if (!video || !range) return;
    if (video.currentTime < range.start || video.currentTime >= range.end) {
      video.currentTime = range.start;
    }
  }

  private enforceLoopBoundary(mediaTime = this.video?.currentTime ?? 0): void {
    const video = this.video;
    const range = this.loopRangeSeconds;
    if (!video || !range || video.paused) return;
    if (mediaTime >= range.end || mediaTime < range.start) {
      video.currentTime = range.start;
    }
  }

  private scheduleLoopCheck(): void {
    const video = this.video;
    if (
      !video ||
      video.paused ||
      !this.loopRangeSeconds ||
      this.videoFrameCallbackId !== null ||
      typeof video.requestVideoFrameCallback !== 'function'
    ) {
      return;
    }
    this.videoFrameCallbackId = video.requestVideoFrameCallback((_now, metadata) => {
      this.videoFrameCallbackId = null;
      this.enforceLoopBoundary(metadata.mediaTime);
      this.scheduleLoopCheck();
    });
  }

  private cancelLoopCheck(): void {
    const video = this.video;
    if (
      video &&
      this.videoFrameCallbackId !== null &&
      typeof video.cancelVideoFrameCallback === 'function'
    ) {
      video.cancelVideoFrameCallback(this.videoFrameCallbackId);
    }
    this.videoFrameCallbackId = null;
  }

  private addListeners(): void {
    for (const eventName of [
      'timeupdate',
      'durationchange',
      'loadedmetadata',
      'play',
      'pause',
      'ended',
      'seeked',
      'canplay',
      'ratechange',
      'volumechange',
    ]) {
      this.video?.addEventListener(eventName, this.handleMediaEvent);
    }
  }

  private removeListeners(): void {
    this.cancelLoopCheck();
    for (const eventName of [
      'timeupdate',
      'durationchange',
      'loadedmetadata',
      'play',
      'pause',
      'ended',
      'seeked',
      'canplay',
      'ratechange',
      'volumechange',
    ]) {
      this.video?.removeEventListener(eventName, this.handleMediaEvent);
    }
  }
}
