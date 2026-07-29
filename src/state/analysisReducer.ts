import type {
  AnalysisRange,
  Delegate,
  PoseModelId,
  RawPoseSample,
} from '../types';

export type AnalysisPhase =
  | 'idle'
  | 'analyzing'
  | 'partial'
  | 'ready'
  | 'cancelled'
  | 'error';

export type AnalysisState = {
  sessionId: number;
  jobId: number | null;
  phase: AnalysisPhase;
  range: AnalysisRange | null;
  samples: RawPoseSample[];
  completedRequestMicroseconds: number[];
  completed: number;
  total: number;
  analyzedThroughMicroseconds: number | null;
  delegate: Delegate | null;
  model: PoseModelId | null;
  error: string | null;
  errorDetails: string | null;
};

export const initialAnalysisState = (sessionId = 0): AnalysisState => ({
  sessionId,
  jobId: null,
  phase: 'idle',
  range: null,
  samples: [],
  completedRequestMicroseconds: [],
  completed: 0,
  total: 0,
  analyzedThroughMicroseconds: null,
  delegate: null,
  model: null,
  error: null,
  errorDetails: null,
});

export type AnalysisAction =
  | { type: 'reset'; sessionId: number }
  | {
      type: 'start';
      sessionId: number;
      jobId: number;
      range: AnalysisRange;
      total: number;
      resume: boolean;
      model: PoseModelId;
    }
  | { type: 'delegate'; sessionId: number; jobId: number; delegate: Delegate }
  | {
      type: 'attempt';
      sessionId: number;
      jobId: number;
      requestedTimestampMicroseconds: number;
      sample: RawPoseSample | null;
      completed: number;
      total: number;
    }
  | { type: 'complete'; sessionId: number; jobId: number }
  | { type: 'cancel'; sessionId: number; jobId: number }
  | {
      type: 'fail';
      sessionId: number;
      jobId: number;
      error: string;
      errorDetails: string;
    };

const matchesActiveJob = (
  state: AnalysisState,
  action: { sessionId: number; jobId: number },
) => state.sessionId === action.sessionId && state.jobId === action.jobId;

export function analysisReducer(
  state: AnalysisState,
  action: AnalysisAction,
): AnalysisState {
  if (action.type === 'reset') return initialAnalysisState(action.sessionId);

  if (action.type === 'start') {
    if (action.sessionId !== state.sessionId) return state;
    return {
      ...state,
      jobId: action.jobId,
      phase: 'analyzing',
      range: action.range,
      samples: action.resume ? state.samples : [],
      completedRequestMicroseconds: action.resume
        ? state.completedRequestMicroseconds
        : [],
      completed: action.resume ? state.completed : 0,
      total: action.total,
      analyzedThroughMicroseconds: action.resume
        ? state.analyzedThroughMicroseconds
        : null,
      delegate: null,
      model: action.model,
      error: null,
      errorDetails: null,
    };
  }

  if (!matchesActiveJob(state, action)) return state;

  if (action.type === 'delegate') return { ...state, delegate: action.delegate };
  if (action.type === 'attempt') {
    const samples = action.sample
      ? [
          ...state.samples.filter(
            (sample) => sample.timestampMicroseconds !== action.sample!.timestampMicroseconds,
          ),
          action.sample,
        ].sort((a, b) => a.timestampMicroseconds - b.timestampMicroseconds)
      : state.samples;
    const completedRequestMicroseconds = state.completedRequestMicroseconds.includes(
      action.requestedTimestampMicroseconds,
    )
      ? state.completedRequestMicroseconds
      : [...state.completedRequestMicroseconds, action.requestedTimestampMicroseconds];
    return {
      ...state,
      phase: 'partial',
      samples,
      completedRequestMicroseconds,
      completed: action.completed,
      total: action.total,
      analyzedThroughMicroseconds: Math.max(
        state.analyzedThroughMicroseconds ?? action.requestedTimestampMicroseconds,
        action.requestedTimestampMicroseconds,
      ),
    };
  }
  if (action.type === 'complete') {
    return { ...state, phase: 'ready', error: null, errorDetails: null };
  }
  if (action.type === 'cancel') {
    return { ...state, phase: 'cancelled', error: null, errorDetails: null };
  }
  return {
    ...state,
    phase: 'error',
    error: action.error,
    errorDetails: action.errorDetails,
  };
}
