/// <reference types="vite/client" />

import type { BenchmarkSummary, SourceMetadata } from './types';

declare global {
  interface Window {
    __CRUX_SPIKE__?: {
      metadata: SourceMetadata | null;
      summary: BenchmarkSummary | null;
    };
  }
}

export {};
