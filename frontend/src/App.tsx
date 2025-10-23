import { useEffect } from "react";
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";
import ProcessingSpinner from "./components/ProcessingSpinner";
import VideoPlayer from "./components/VideoPlayer";
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
					<div className="mt-8">
						{data.result.video_url ? (
							<div className="max-w-4xl mx-auto">
								<VideoPlayer
									videoUrl={data.result.video_url}
									title="Climbing Analysis with Skeleton Overlay"
									onError={(error) => {
										console.error(
											"Video player error:",
											error
										);
									}}
								/>

								{/* Analysis Results Section */}
								<div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold text-gray-900">
											Analysis Results
										</h3>
										<div className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-full text-green-700 bg-green-100">
											<svg
												className="h-4 w-4 mr-1"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
											Complete
										</div>
									</div>

									{/* Analysis Info Grid */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
										<div className="bg-gray-50 rounded-lg p-4">
											<h4 className="text-sm font-medium text-gray-700 mb-2">
												Analysis Details
											</h4>
											<div className="space-y-2 text-sm text-gray-600">
												<div>
													<span className="font-medium">
														ID:
													</span>{" "}
													{data.result.id.slice(0, 8)}
													...
												</div>
												<div>
													<span className="font-medium">
														Created:
													</span>{" "}
													{new Date(
														data.result.created_at
													).toLocaleDateString()}
												</div>
												<div>
													<span className="font-medium">
														Status:
													</span>{" "}
													{data.result.status}
												</div>
											</div>
										</div>

										<div className="bg-gray-50 rounded-lg p-4">
											<h4 className="text-sm font-medium text-gray-700 mb-2">
												Metrics
											</h4>
											<div className="space-y-2 text-sm text-gray-600">
												{data.result.metrics ? (
													<>
														{data.result.metrics
															.avg_hip_angle && (
															<div>
																<span className="font-medium">
																	Avg Hip
																	Angle:
																</span>{" "}
																{data.result.metrics.avg_hip_angle.toFixed(
																	1
																)}
																°
															</div>
														)}
														{data.result.metrics
															.avg_knee_angle && (
															<div>
																<span className="font-medium">
																	Avg Knee
																	Angle:
																</span>{" "}
																{data.result.metrics.avg_knee_angle.toFixed(
																	1
																)}
																°
															</div>
														)}
														{data.result.metrics
															.stability_score && (
															<div>
																<span className="font-medium">
																	Stability
																	Score:
																</span>{" "}
																{data.result.metrics.stability_score.toFixed(
																	2
																)}
															</div>
														)}
													</>
												) : (
													<div className="text-gray-500 italic">
														Metrics will be
														available in future
														updates
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Action Buttons */}
									<div className="flex justify-center space-x-4">
										<button
											onClick={reset}
											className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
										>
											<svg
												className="h-4 w-4 mr-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
												/>
											</svg>
											Upload New Video
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className="text-center">
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
									<p>Video overlay is being generated...</p>
								</div>
								<div className="mt-4">
									<button
										onClick={reset}
										className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
									>
										Upload New Video
									</button>
								</div>
							</div>
						)}
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
						<div className="mt-4 space-x-4">
							<button
								onClick={reset}
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
							>
								<svg
									className="h-4 w-4 mr-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
									/>
								</svg>
								Upload New Video
							</button>
							<button
								onClick={reset}
								className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
							>
								Try Again
							</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
