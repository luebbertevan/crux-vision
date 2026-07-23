import { describe, expect, it } from 'vitest';

import { analysisReducer, initialAnalysisState } from './analysisReducer';

describe('analysisReducer stale-result protection', () => {
  it('ignores results from an old source and job', () => {
    let state = initialAnalysisState(2);
    state = analysisReducer(state, {
      type: 'start',
      sessionId: 2,
      jobId: 8,
      range: { startMicroseconds: 0, endMicroseconds: 1_000_000 },
      total: 2,
      resume: false,
    });

    const staleSource = analysisReducer(state, {
      type: 'attempt',
      sessionId: 1,
      jobId: 8,
      requestedTimestampMicroseconds: 0,
      sample: null,
      completed: 1,
      total: 2,
    });
    const staleJob = analysisReducer(state, {
      type: 'attempt',
      sessionId: 2,
      jobId: 7,
      requestedTimestampMicroseconds: 0,
      sample: null,
      completed: 1,
      total: 2,
    });

    expect(staleSource).toBe(state);
    expect(staleJob).toBe(state);
  });

  it('keeps partial progress when cancelled and when resumed', () => {
    let state = initialAnalysisState(1);
    state = analysisReducer(state, {
      type: 'start', sessionId: 1, jobId: 1,
      range: { startMicroseconds: 0, endMicroseconds: 1_000_000 }, total: 3, resume: false,
    });
    state = analysisReducer(state, {
      type: 'attempt', sessionId: 1, jobId: 1,
      requestedTimestampMicroseconds: 0, sample: null, completed: 1, total: 3,
    });
    state = analysisReducer(state, { type: 'cancel', sessionId: 1, jobId: 1 });
    state = analysisReducer(state, {
      type: 'start', sessionId: 1, jobId: 2,
      range: { startMicroseconds: 0, endMicroseconds: 1_000_000 }, total: 3, resume: true,
    });
    expect(state.completed).toBe(1);
    expect(state.completedRequestMicroseconds).toEqual([0]);
  });
});
