import { AnalysisState } from "../utils/types";

interface ProcessingSpinnerProps {
	state: AnalysisState;
	progress: number;
	onCancel?: () => void;
}

interface ProcessingStage {
	id: string;
	label: string;
	description: string;
	completed: boolean;
	active: boolean;
}

function ProcessingSpinner({
	state,
	progress,
	onCancel,
}: ProcessingSpinnerProps) {
	const getProcessingStages = (): ProcessingStage[] => {
		const isUploading = state === AnalysisState.UPLOADING;
		const isProcessing = state === AnalysisState.PROCESSING;

		return [
			{
				id: "upload",
				label: "Uploading Video",
				description: "Sending your video to our servers...",
				completed: isProcessing || progress >= 25,
				active: isUploading,
			},
			{
				id: "analyze",
				label: "Analyzing Pose",
				description: "Extracting pose data from your climbing video...",
				completed: progress >= 75,
				active: isProcessing && progress >= 25 && progress < 75,
			},
			{
				id: "overlay",
				label: "Generating Overlay",
				description: "Creating skeleton overlay video...",
				completed: progress >= 100,
				active: isProcessing && progress >= 75,
			},
		];
	};

	const stages = getProcessingStages();
	const activeStage = stages.find((stage) => stage.active);

	return (
		<div className="w-full max-w-2xl mx-auto">
			<div className="bg-white rounded-lg shadow-lg p-8">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
						<svg
							className="animate-spin h-8 w-8 text-blue-600"
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
					</div>
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						Analyzing Your Climbing Video
					</h3>
					<p className="text-gray-600">
						This may take a few minutes depending on video length
					</p>
				</div>

				{/* Progress Bar */}
				<div className="mb-8">
					<div className="flex justify-between items-center mb-2">
						<span className="text-sm font-medium text-gray-700">
							Progress
						</span>
						<span className="text-sm text-gray-500">
							{progress}%
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-3">
						<div
							className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				</div>

				{/* Processing Stages */}
				<div className="space-y-4 mb-8">
					{stages.map((stage, index) => (
						<div
							key={stage.id}
							className={`flex items-center p-4 rounded-lg border-2 transition-all duration-300 ${
								stage.active
									? "border-blue-200 bg-blue-50"
									: stage.completed
									? "border-green-200 bg-green-50"
									: "border-gray-200 bg-gray-50"
							}`}
						>
							<div className="flex-shrink-0 mr-4">
								{stage.completed ? (
									<div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
										<svg
											className="w-5 h-5 text-white"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
								) : stage.active ? (
									<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
										<svg
											className="animate-spin w-5 h-5 text-white"
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
									</div>
								) : (
									<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
										<span className="text-gray-600 text-sm font-medium">
											{index + 1}
										</span>
									</div>
								)}
							</div>
							<div className="flex-1">
								<h4
									className={`font-medium ${
										stage.active
											? "text-blue-900"
											: stage.completed
											? "text-green-900"
											: "text-gray-700"
									}`}
								>
									{stage.label}
								</h4>
								<p
									className={`text-sm ${
										stage.active
											? "text-blue-700"
											: stage.completed
											? "text-green-700"
											: "text-gray-500"
									}`}
								>
									{stage.description}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Current Stage Highlight */}
				{activeStage && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
						<div className="flex items-center">
							<div className="flex-shrink-0 mr-3">
								<svg
									className="animate-pulse h-5 w-5 text-blue-600"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div>
								<p className="text-sm font-medium text-blue-900">
									Currently: {activeStage.label}
								</p>
								<p className="text-sm text-blue-700">
									{activeStage.description}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Cancel Button */}
				{onCancel && (
					<div className="text-center">
						<button
							onClick={onCancel}
							className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<svg
								className="w-4 h-4 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							Cancel Analysis
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default ProcessingSpinner;
