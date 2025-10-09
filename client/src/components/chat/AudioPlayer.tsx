import { memo, useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Mic, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

interface AudioPlayerProps {
  audioUrl: string;
  isOwnMessage?: boolean;
}

export const AudioPlayer = memo(({ audioUrl, isOwnMessage = false }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateTime = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0); // Reset progress bar when audio ends
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleError = (e: Event) => {
      console.error("Audio load error:", (e.target as HTMLAudioElement)?.error);
      setIsLoading(false);
      toast.error("Failed to load audio. Please try refreshing the page.");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    // Start time updates when audio starts playing
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTime, audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    } catch (err) {
      console.error("Audio play failed:", err);
      toast.error("Could not play audio. Try again.");
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const iconColor = isOwnMessage ? "#ffffff" : "#374151";
  const buttonBg = isOwnMessage
    ? "bg-blue-600 hover:bg-blue-700"
    : "bg-gray-200 hover:bg-gray-300";
  const textColor = isOwnMessage ? "text-white" : "text-gray-700";

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-full">
      <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="use-credentials" />

      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`p-2 rounded-full ${buttonBg} transition-all disabled:opacity-50 flex-shrink-0`}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" style={{ color: iconColor }} />
        ) : isPlaying ? (
          <Pause size={16} style={{ color: iconColor }} />
        ) : (
          <Play size={16} style={{ color: iconColor }} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Mic size={12} className={`opacity-60 flex-shrink-0 ${textColor}`} />
          <span className={`text-xs opacity-75 truncate ${textColor}`}>Voice message</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            disabled={isLoading}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: isOwnMessage
                ? `linear-gradient(to right, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.6) ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, rgba(255,255,255,0.3) ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, rgba(255,255,255,0.3) 100%)`
                : `linear-gradient(to right, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.6) ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, rgba(209, 213, 219, 0.5) ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, rgba(209, 213, 219, 0.5) 100%)`,
            }}
          />
          <span className={`text-xs opacity-60 flex-shrink-0 w-[45px] text-right ${textColor}`}>
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
});

AudioPlayer.displayName = "AudioPlayer";