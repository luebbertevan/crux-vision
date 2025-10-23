import { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
	videoUrl: string;
	title?: string;
	onError?: (error: string) => void;
	className?: string;
}

function VideoPlayer({
	videoUrl,
	title = "Analysis Results",
	onError,
	className = "",
}: VideoPlayerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [, setIsFullscreen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const errorTimeoutRef = useRef<number | null>(null);

	// Update current time
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleTimeUpdate = () => setCurrentTime(video.currentTime);
		const handleLoadedMetadata = () => {
			setDuration(video.duration);
			setIsLoading(false);
			setError(null);
			// Clear any pending error timeout
			if (errorTimeoutRef.current) {
				clearTimeout(errorTimeoutRef.current);
				errorTimeoutRef.current = null;
			}
		};
		const handleLoadStart = () => {
			setIsLoading(true);
			setError(null);
		};
		const handleCanPlay = () => {
			setIsLoading(false);
			setError(null);
			// Clear any pending error timeout
			if (errorTimeoutRef.current) {
				clearTimeout(errorTimeoutRef.current);
				errorTimeoutRef.current = null;
			}
		};
		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);
		const handleVolumeChange = () => {
			setVolume(video.volume);
			setIsMuted(video.muted);
		};

		video.addEventListener("timeupdate", handleTimeUpdate);
		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		video.addEventListener("loadstart", handleLoadStart);
		video.addEventListener("canplay", handleCanPlay);
		video.addEventListener("play", handlePlay);
		video.addEventListener("pause", handlePause);
		video.addEventListener("volumechange", handleVolumeChange);

		return () => {
			video.removeEventListener("timeupdate", handleTimeUpdate);
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			video.removeEventListener("loadstart", handleLoadStart);
			video.removeEventListener("canplay", handleCanPlay);
			video.removeEventListener("play", handlePlay);
			video.removeEventListener("pause", handlePause);
			video.removeEventListener("volumechange", handleVolumeChange);

			// Clear timeout on cleanup
			if (errorTimeoutRef.current) {
				clearTimeout(errorTimeoutRef.current);
			}
		};
	}, []);

	// Handle video errors
	const handleVideoError = (
		e: React.SyntheticEvent<HTMLVideoElement, Event>
	) => {
		const video = e.target as HTMLVideoElement;
		const error = video.error;

		console.log("Video error event triggered:", {
			error,
			videoSrc: video.src,
			videoNetworkState: video.networkState,
			videoReadyState: video.readyState,
			currentSrc: video.currentSrc,
		});

		// Don't show error if video is actually loading or loaded
		if (video.readyState >= 2 || video.networkState === 1) {
			console.log("Video is loading, ignoring error event");
			return;
		}

		// Don't show error if we're in the middle of loading
		if (video.networkState === 2) {
			console.log(
				"Video is loading (network state 2), ignoring error event"
			);
			return;
		}

		let errorMessage = "Failed to load video. Please try again.";

		if (error) {
			switch (error.code) {
				case error.MEDIA_ERR_ABORTED:
					errorMessage = "Video loading was aborted.";
					break;
				case error.MEDIA_ERR_NETWORK:
					errorMessage = "Network error while loading video.";
					break;
				case error.MEDIA_ERR_DECODE:
					errorMessage = "Video format not supported.";
					break;
				case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					errorMessage = "Video format not supported.";
					break;
				default:
					errorMessage = "Unknown video error.";
					break;
			}
		}

		console.error("Video error:", error, errorMessage);

		// Clear any existing timeout
		if (errorTimeoutRef.current) {
			clearTimeout(errorTimeoutRef.current);
		}

		// Delay error display to give video more time to load
		errorTimeoutRef.current = setTimeout(() => {
			setError(errorMessage);
			setIsLoading(false);
			onError?.(errorMessage);
		}, 1000);
	};

	// Play/pause toggle
	const togglePlayPause = () => {
		const video = videoRef.current;
		if (!video) return;

		if (video.paused) {
			video.play();
		} else {
			video.pause();
		}
	};

	// Seek to specific time
	const handleSeek = (time: number) => {
		const video = videoRef.current;
		if (!video) return;

		video.currentTime = time;
		setCurrentTime(time);
	};

	// Handle seek bar change
	const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = parseFloat(e.target.value);
		handleSeek(time);
	};

	// Toggle mute
	const toggleMute = () => {
		const video = videoRef.current;
		if (!video) return;

		video.muted = !video.muted;
		setIsMuted(video.muted);
	};

	// Handle volume change
	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const video = videoRef.current;
		if (!video) return;

		const newVolume = parseFloat(e.target.value);
		video.volume = newVolume;
		setVolume(newVolume);
		setIsMuted(newVolume === 0);
	};

	// Toggle fullscreen
	const toggleFullscreen = () => {
		const video = videoRef.current;
		if (!video) return;

		if (!document.fullscreenElement) {
			video.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
		}
	};

	// Format time as MM:SS
	const formatTime = (time: number): string => {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	// Retry loading video
	const retryLoad = () => {
		setError(null);
		setIsLoading(true);
		const video = videoRef.current;
		if (video) {
			video.load();
		}
	};

	return (
		<div
			className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
		>
			{/* Video Container */}
			<div className="relative bg-black">
				{/* Loading Overlay */}
				{isLoading && !error && (
					<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
						<div className="text-center">
							<svg
								className="animate-spin h-8 w-8 text-white mx-auto mb-2"
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
							<p className="text-white text-sm">
								Loading video...
							</p>
						</div>
					</div>
				)}

				{/* Error Overlay */}
				{error && (
					<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
						<div className="text-center text-white p-6">
							<svg
								className="h-12 w-12 text-red-400 mx-auto mb-4"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="text-lg font-medium mb-2">
								Video Load Error
							</p>
							<p className="text-sm mb-4">{error}</p>
							<button
								onClick={retryLoad}
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Retry
							</button>
						</div>
					</div>
				)}

				{/* Video Element */}
				<video
					ref={videoRef}
					className="w-full h-auto max-h-96"
					onError={handleVideoError}
					preload="auto"
					src={videoUrl}
					controls
				>
					Your browser does not support the video tag.
				</video>
			</div>

			{/* Controls */}
			<div className="p-4 bg-gray-50">
				{/* Title */}
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					{title}
				</h3>

				{/* Progress Bar */}
				<div className="mb-4">
					<input
						type="range"
						min="0"
						max={duration || 0}
						value={currentTime}
						onChange={handleSeekBarChange}
						className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
					/>
					<div className="flex justify-between text-sm text-gray-600 mt-1">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>

				{/* Control Buttons */}
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						{/* Play/Pause */}
						<button
							onClick={togglePlayPause}
							className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							{isPlaying ? (
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
										clipRule="evenodd"
									/>
								</svg>
							) : (
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
										clipRule="evenodd"
									/>
								</svg>
							)}
						</button>

						{/* Volume */}
						<div className="flex items-center space-x-2">
							<button
								onClick={toggleMute}
								className="text-gray-600 hover:text-gray-800 focus:outline-none"
							>
								{isMuted || volume === 0 ? (
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								) : (
									<svg
										className="w-5 h-5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								)}
							</button>
							<input
								type="range"
								min="0"
								max="1"
								step="0.1"
								value={isMuted ? 0 : volume}
								onChange={handleVolumeChange}
								className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
							/>
						</div>
					</div>

					{/* Fullscreen */}
					<button
						onClick={toggleFullscreen}
						className="text-gray-600 hover:text-gray-800 focus:outline-none"
					>
						<svg
							className="w-5 h-5"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>

			{/* Custom Slider Styles */}
			<style>{`
				.slider::-webkit-slider-thumb {
					appearance: none;
					height: 16px;
					width: 16px;
					border-radius: 50%;
					background: #3b82f6;
					cursor: pointer;
					border: 2px solid #ffffff;
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
				}

				.slider::-moz-range-thumb {
					height: 16px;
					width: 16px;
					border-radius: 50%;
					background: #3b82f6;
					cursor: pointer;
					border: 2px solid #ffffff;
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
				}
			`}</style>
		</div>
	);
}

export default VideoPlayer;
