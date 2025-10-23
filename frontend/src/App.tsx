import { useEffect } from "react";
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";
import ProcessingSpinner from "./components/ProcessingSpinner";
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
					<div className="mt-8">
						<ProcessingSpinner
							state={data.state}
							progress={data.progress}
							onCancel={reset}
						/>
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
