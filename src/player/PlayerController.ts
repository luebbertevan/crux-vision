export type PlayerSnapshot = {
  currentTimeSeconds: number;
  durationSeconds: number;
  playing: boolean;
  ready: boolean;
};

const EMPTY_SNAPSHOT: PlayerSnapshot = {
  currentTimeSeconds: 0,
  durationSeconds: 0,
  playing: false,
  ready: false,
};

export class PlayerController {
  private video: HTMLVideoElement | null = null;
  private snapshot = EMPTY_SNAPSHOT;
  private readonly listeners = new Set<() => void>();

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = () => this.snapshot;

  attach(video: HTMLVideoElement | null): void {
    if (this.video === video) return;
    this.removeListeners();
    this.video = video;
    this.addListeners();
    this.publish();
  }

  async togglePlayback(): Promise<void> {
    if (!this.video) return;
    if (this.video.paused) await this.video.play();
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

  destroy(): void {
    this.removeListeners();
    this.video = null;
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
        }
      : EMPTY_SNAPSHOT;
    if (
      next.currentTimeSeconds === this.snapshot.currentTimeSeconds &&
      next.durationSeconds === this.snapshot.durationSeconds &&
      next.playing === this.snapshot.playing &&
      next.ready === this.snapshot.ready
    ) {
      return;
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  };

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
    ]) {
      this.video?.addEventListener(eventName, this.publish);
    }
  }

  private removeListeners(): void {
    for (const eventName of [
      'timeupdate',
      'durationchange',
      'loadedmetadata',
      'play',
      'pause',
      'ended',
      'seeked',
      'canplay',
    ]) {
      this.video?.removeEventListener(eventName, this.publish);
    }
  }
}
