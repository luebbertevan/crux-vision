import {
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  Input,
  type InputVideoTrack,
  type WrappedCanvas,
} from 'mediabunny';

import type { SourceMetadata } from '../types';

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
        codec,
        codedWidth,
        codedHeight,
        displayWidth,
        displayHeight,
        rotationDegreesClockwise,
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

  async *framesAt(timestampsSeconds: number[]): AsyncGenerator<WrappedCanvas> {
    const sink = this.createSampleSink();
    for await (const wrapped of sink.canvasesAtTimestamps(timestampsSeconds)) {
      if (wrapped) {
        yield wrapped;
      }
    }
  }

  dispose(): void {
    this.input.dispose();
  }
}
