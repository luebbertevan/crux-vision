import axios, { AxiosResponse } from "axios";
import { AnalyzeResponse, Result, ErrorResponse } from "../utils/types";

// Create axios instance with base configuration
const apiClient = axios.create({
	baseURL: "http://localhost:8000",
	timeout: 30000, // 30 seconds timeout for uploads
	headers: {
		"Content-Type": "application/json",
	},
});

// Request interceptor for logging
apiClient.interceptors.request.use(
	(config) => {
		console.log(
			`API Request: ${config.method?.toUpperCase()} ${config.url}`
		);
		return config;
	},
	(error) => {
		console.error("API Request Error:", error);
		return Promise.reject(error);
	}
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
	(response) => {
		console.log(`API Response: ${response.status} ${response.config.url}`);
		return response;
	},
	(error) => {
		console.error("API Response Error:", error);

		// Handle network errors
		if (!error.response) {
			throw new Error(
				"Network error. Please check your connection and ensure the backend is running."
			);
		}

		// Handle HTTP errors
		const status = error.response.status;
		const message =
			error.response.data?.error ||
			error.response.data?.detail ||
			error.message;

		switch (status) {
			case 400:
				throw new Error(`Bad Request: ${message}`);
			case 404:
				throw new Error(`Not Found: ${message}`);
			case 413:
				throw new Error("File too large. Please try a smaller file.");
			case 500:
				throw new Error("Server error. Please try again later.");
			default:
				throw new Error(`Error ${status}: ${message}`);
		}
	}
);

export const api = {
	/**
	 * Upload a video file for analysis
	 */
	async uploadVideo(file: File): Promise<AnalyzeResponse> {
		const formData = new FormData();
		formData.append("file", file);

		const response: AxiosResponse<AnalyzeResponse> = await apiClient.post(
			"/api/analyze",
			formData,
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
				timeout: 60000, // 60 seconds for uploads
			}
		);

		return response.data;
	},

	/**
	 * Get analysis results by ID
	 */
	async getResults(analysisId: string): Promise<Result> {
		const response: AxiosResponse<Result> = await apiClient.get(
			`/api/results/${analysisId}`
		);

		// Convert relative video URLs to absolute URLs
		if (
			response.data.video_url &&
			response.data.video_url.startsWith("/")
		) {
			response.data.video_url = `http://localhost:8000${response.data.video_url}`;
		}

		return response.data;
	},

	/**
	 * Health check endpoint
	 */
	async ping(): Promise<{ message: string }> {
		const response: AxiosResponse<{ message: string }> =
			await apiClient.get("/api/ping");

		return response.data;
	},
};

export default api;
