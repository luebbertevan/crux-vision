import { useState } from "react";
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";

function App() {
	const [isUploading, setIsUploading] = useState(false);

	const handleFileSelect = (file: File) => {
		console.log("File selected:", file.name);
		// TODO: In M5c, this will trigger the actual upload
		setIsUploading(true);

		// Simulate processing for now
		setTimeout(() => {
			setIsUploading(false);
			alert(
				`File "${file.name}" selected successfully! (Upload will be implemented in M5c)`
			);
		}, 2000);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<Header />
			<main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-8">
					<h2 className="text-3xl font-bold text-gray-900 mb-4">
						Analyze Your Climbing Technique
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						Upload a climbing video to get
						AI-powered feedback on your technique, pose analysis,
						and personalized coaching tips.
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
							Processing your video...
						</div>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
