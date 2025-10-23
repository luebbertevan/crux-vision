import { useState, useCallback, useRef } from "react";
import { api } from "../api/client";
import { AnalysisData, AnalysisState, Result } from "../utils/types";

export function useAnalysis() {
	const [data, setData] = useState<AnalysisData>({
		state: AnalysisState.IDLE,
		analysisId: null,
		result: null,
		error: null,
		progress: 0,
	});

	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Clear polling interval
	const clearPolling = useCallback(() => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}
	}, []);

	// Start polling for results
	const startPolling = useCallback(
		(analysisId: string) => {
			clearPolling();

			pollingIntervalRef.current = setInterval(async () => {
				try {
					const result = await api.getResults(analysisId);

					setData((prev) => ({
						...prev,
						result,
						progress: result.status === "processing" ? 50 : 100,
					}));

					if (
						result.status === "complete" ||
						result.status === "error"
					) {
						clearPolling();
						setData((prev) => ({
							...prev,
							state:
								result.status === "complete"
									? AnalysisState.COMPLETE
									: AnalysisState.ERROR,
							error: result.error_message,
						}));
					}
				} catch (error) {
					console.error("Polling error:", error);
					clearPolling();
					setData((prev) => ({
						...prev,
						state: AnalysisState.ERROR,
						error:
							error instanceof Error
								? error.message
								: "Failed to get results",
					}));
				}
			}, 2000); // Poll every 2 seconds
		},
		[clearPolling]
	);

	// Upload video file
	const uploadVideo = useCallback(
		async (file: File) => {
			setData({
				state: AnalysisState.UPLOADING,
				analysisId: null,
				result: null,
				error: null,
				progress: 0,
			});

			try {
				// Upload file
				const response = await api.uploadVideo(file);

				setData((prev) => ({
					...prev,
					state: AnalysisState.PROCESSING,
					analysisId: response.id,
					progress: 25,
				}));

				// Start polling for results
				startPolling(response.id);
			} catch (error) {
				console.error("Upload error:", error);
				setData((prev) => ({
					...prev,
					state: AnalysisState.ERROR,
					error:
						error instanceof Error
							? error.message
							: "Failed to upload video",
				}));
			}
		},
		[startPolling]
	);

	// Reset analysis state
	const reset = useCallback(() => {
		clearPolling();
		setData({
			state: AnalysisState.IDLE,
			analysisId: null,
			result: null,
			error: null,
			progress: 0,
		});
	}, [clearPolling]);

	// Cleanup on unmount
	const cleanup = useCallback(() => {
		clearPolling();
	}, [clearPolling]);

	return {
		data,
		uploadVideo,
		reset,
		cleanup,
	};
}
