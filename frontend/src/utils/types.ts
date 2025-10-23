export interface AnalyzeResponse {
	id: string;
	status_url: string;
}

export interface ResultMetrics {
	avg_hip_angle: number | null;
	avg_knee_angle: number | null;
	stability_score: number | null;
}

export interface Result {
	id: string;
	status: "processing" | "complete" | "error";
	created_at: string;
	metrics: ResultMetrics | null;
	feedback: string[] | null;
	video_url: string | null;
	error_message: string | null;
}

export interface ErrorResponse {
	error: string;
}

export enum AnalysisState {
	IDLE = "idle",
	UPLOADING = "uploading",
	PROCESSING = "processing",
	COMPLETE = "complete",
	ERROR = "error",
}

export interface AnalysisData {
	state: AnalysisState;
	analysisId: string | null;
	result: Result | null;
	error: string | null;
	progress: number;
}
