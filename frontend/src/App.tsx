import { useEffect } from "react";
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";
import { useAnalysis } from "./hooks/useAnalysis";
import { AnalysisState } from "./utils/types";

function App() {
	const { data, uploadVideo, reset, cleanup } = useAnalysis();

	// Cleanup on unmount
	useEffect(() => {
		return cleanup;
	}, [cleanup]);

	const handleFileSelect = (file: File) => {
		reset();
		uploadVideo(file);
	};

	const isUploading =
		data.state === AnalysisState.UPLOADING ||
		data.state === AnalysisState.PROCESSING;

	return (
		<div className="min-h-screen bg-gray-50">
			<Header />
			<main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-8">
					<h2 className="text-3xl font-bold text-gray-900 mb-4">
						Analyze Your Climbing Technique
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						Upload a climbing video to get AI-powered feedback on
						your technique, pose analysis, and personalized coaching
						tips.
					</p>
				</div>

				<div className="flex justify-center">
					<FileUpload
						onFileSelect={handleFileSelect}
						isUploading={isUploading}
					/>
				</div>

				{isUploading && (
					<div className="mt-8 text-center">
						<div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100">
							<svg
								className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							{data.state === AnalysisState.UPLOADING
								? "Uploading your video..."
								: "Processing your video..."}
						</div>
						{data.progress > 0 && (
							<div className="mt-4 w-full max-w-md mx-auto">
								<div className="bg-gray-200 rounded-full h-2">
									<div
										className="bg-blue-600 h-2 rounded-full transition-all duration-300"
										style={{ width: `${data.progress}%` }}
									></div>
								</div>
								<p className="text-sm text-gray-600 mt-2">
									{data.progress}% complete
								</p>
							</div>
						)}
					</div>
				)}

				{data.state === AnalysisState.COMPLETE && data.result && (
					<div className="mt-8 text-center">
						<div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100">
							<svg
								className="h-5 w-5 mr-2"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
							Analysis Complete!
						</div>
						<div className="mt-4 text-sm text-gray-600">
							<p>Analysis ID: {data.result.id}</p>
							<p>
								Video URL:{" "}
								{data.result.video_url || "Not available yet"}
							</p>
							<p className="mt-2 text-xs text-gray-500">
								(M5d will add video display component)
							</p>
						</div>
					</div>
				)}

				{data.state === AnalysisState.ERROR && data.error && (
					<div className="mt-8 text-center">
						<div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100">
							<svg
								className="h-5 w-5 mr-2"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clipRule="evenodd"
								/>
							</svg>
							Error: {data.error}
						</div>
						<button
							onClick={reset}
							className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Try Again
						</button>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
