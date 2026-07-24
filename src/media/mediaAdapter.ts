import {
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  Input,
  type InputVideoTrack,
  type WrappedCanvas,
} from 'mediabunny';

import type { SourceMetadata } from '../types';

export type TimedCanvas = {
  requestedTimestampMicroseconds: number;
  timestampMicroseconds: number | null;
  canvas: HTMLCanvasElement | OffscreenCanvas | null;
};

export class BrowserMediaAdapter {
  readonly file: File;
  readonly input: Input<BlobSource>;
  readonly track: InputVideoTrack;
  readonly metadata: SourceMetadata;

  private constructor(
    file: File,
    input: Input<BlobSource>,
    track: InputVideoTrack,
    metadata: SourceMetadata,
  ) {
    this.file = file;
    this.input = input;
    this.track = track;
    this.metadata = metadata;
  }

  static async open(file: File): Promise<BrowserMediaAdapter> {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });

    try {
      const track = await input.getPrimaryVideoTrack();
      if (!track) {
        throw new Error('The selected file does not contain a video track.');
      }

      const [
        durationSeconds,
        mimeType,
        codec,
        codedWidth,
        codedHeight,
        displayWidth,
        displayHeight,
        rotationDegreesClockwise,
        browserCanDecode,
        packetStats,
      ] = await Promise.all([
        input.computeDuration(),
        input.getMimeType(),
        track.getCodec(),
        track.getCodedWidth(),
        track.getCodedHeight(),
        track.getDisplayWidth(),
        track.getDisplayHeight(),
        track.getRotation(),
        track.canDecode(),
        track.computePacketStats(120).catch(() => null),
      ]);

      return new BrowserMediaAdapter(file, input, track, {
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType,
        durationSeconds,
        durationMicroseconds: Math.round(durationSeconds * 1_000_000),
        codec,
        codedWidth,
        codedHeight,
        displayWidth,
        displayHeight,
        rotationDegreesClockwise,
        // MediaBunny 1.51 exposes track rotation but not independent reflection.
        // Keep reflection explicit in the source contract; never infer it from
        // dimensions or camera origin.
        flipHorizontal: false,
        flipVertical: false,
        averageFrameRate: packetStats?.averagePacketRate ?? null,
        browserCanDecode,
      });
    } catch (error) {
      input.dispose();
      throw error;
    }
  }

  createSampleSink(maxDisplayWidth = 512): CanvasSink {
    return new CanvasSink(this.track, {
      width: Math.min(maxDisplayWidth, this.metadata.displayWidth),
      poolSize: 2,
      decoderOptions: { hardwareAcceleration: 'prefer-hardware' },
    });
  }

  async createPosterBlob(maxDisplayWidth = 1_024): Promise<Blob | null> {
    const sink = this.createSampleSink(maxDisplayWidth);
    const iterator = sink.canvases()[Symbol.asyncIterator]();

    try {
      const first = await iterator.next();
      if (first.done || !first.value) return null;

      const canvas = first.value.canvas;
      if (canvas instanceof HTMLCanvasElement) {
        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.86);
        });
      }

      return await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: 0.86,
      });
    } finally {
      await iterator.return?.();
    }
  }

  async *framesAt(
    timestampsMicroseconds: readonly number[],
    signal?: AbortSignal,
  ): AsyncGenerator<TimedCanvas> {
    const sink = this.createSampleSink();
    const timestampsSeconds = timestampsMicroseconds.map(
      (timestamp) => timestamp / 1_000_000,
    );
    const iterator = sink.canvasesAtTimestamps(timestampsSeconds)[Symbol.asyncIterator]();

    try {
      for (const requestedTimestampMicroseconds of timestampsMicroseconds) {
        if (signal?.aborted) throw signal.reason;
        const next = await iterator.next();
        if (next.done) break;
        const wrapped: WrappedCanvas | null = next.value;
        yield {
          requestedTimestampMicroseconds,
          timestampMicroseconds: wrapped ? Math.round(wrapped.timestamp * 1_000_000) : null,
          canvas: wrapped?.canvas ?? null,
        };
      }
    } finally {
      await iterator.return?.();
    }
  }

  dispose(): void {
    this.input.dispose();
  }
}
