import React, { useState, useRef, useCallback } from "react";

interface FileUploadProps {
	onFileSelect: (file: File) => void;
	isUploading?: boolean;
}

function FileUpload({ onFileSelect, isUploading = false }: FileUploadProps) {
	const [error, setError] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const validateFile = useCallback((file: File): string | null => {
		// Check file size (100MB limit)
		const maxSize = 100 * 1024 * 1024; // 100MB in bytes
		if (file.size > maxSize) {
			return `File too large. Maximum size: 100MB. Your file: ${(
				file.size /
				(1024 * 1024)
			).toFixed(1)}MB`;
		}

		// Check file type
		const allowedTypes = [
			"video/mp4",
			"video/quicktime",
			"video/x-msvideo",
		];
		const allowedExtensions = [".mp4", ".mov", ".avi"];

		const fileExtension = file.name
			.toLowerCase()
			.substring(file.name.lastIndexOf("."));

		if (
			!allowedTypes.includes(file.type) &&
			!allowedExtensions.includes(fileExtension)
		) {
			return "Invalid file format. Allowed formats: MP4, MOV, AVI";
		}

		return null;
	}, []);

	const handleFileSelect = useCallback(
		(file: File) => {
			setError(null);

			const validationError = validateFile(file);
			if (validationError) {
				setError(validationError);
				return;
			}

			setSelectedFile(file);
			onFileSelect(file);
		},
		[validateFile, onFileSelect]
	);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleButtonClick = () => {
		fileInputRef.current?.click();
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	return (
		<div className="w-full max-w-2xl mx-auto">
			<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
				<div className="space-y-4">
					<div className="text-gray-600">
						<svg
							className="mx-auto h-12 w-12 text-gray-400"
							stroke="currentColor"
							fill="none"
							viewBox="0 0 48 48"
						>
							<path
								d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>

					<div>
						<h3 className="text-lg font-medium text-gray-900">
							Upload Climbing Video
						</h3>
						<p className="text-sm text-gray-500 mt-1">
							Select a video file to analyze your climbing
							technique
						</p>
					</div>

					{selectedFile && !error && (
						<div className="bg-green-50 border border-green-200 rounded-md p-3">
							<div className="flex items-center">
								<svg
									className="h-5 w-5 text-green-400 mr-2"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
								<div className="text-sm">
									<p className="text-green-800 font-medium">
										{selectedFile.name}
									</p>
									<p className="text-green-600">
										{formatFileSize(selectedFile.size)}
									</p>
								</div>
							</div>
						</div>
					)}

					{error && (
						<div className="bg-red-50 border border-red-200 rounded-md p-3">
							<div className="flex items-center">
								<svg
									className="h-5 w-5 text-red-400 mr-2"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
								<p className="text-red-800 text-sm">{error}</p>
							</div>
						</div>
					)}

					<div>
						<button
							type="button"
							onClick={handleButtonClick}
							disabled={isUploading}
							className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg
								className="h-5 w-5 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
							{isUploading
								? "Processing..."
								: "Select Video File"}
						</button>
					</div>

					<div className="text-xs text-gray-500">
						<p>Supported formats: MP4, MOV, AVI</p>
						<p>Maximum file size: 100MB</p>
					</div>
				</div>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
				onChange={handleInputChange}
				className="hidden"
			/>
		</div>
	);
}

export default FileUpload;
