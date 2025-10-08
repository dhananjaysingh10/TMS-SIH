// components/chat/AudioPlayer.tsx
import { memo, useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio play failed:", err);
      toast.error("Could not play audio. Try again.");
      setIsPlaying(false);
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
    ? "bg-white bg-opacity-20 hover:bg-opacity-30"
    : "bg-gray-200 hover:bg-gray-300";
  const textColor = isOwnMessage ? "text-white" : "text-gray-700";

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-full">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

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
                    (currentTime / duration) * 100
                  }%, rgba(255,255,255,0.3) ${
                    (currentTime / duration) * 100
                  }%, rgba(255,255,255,0.3) 100%)`
                : `linear-gradient(to right, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.6) ${
                    (currentTime / duration) * 100
                  }%, rgba(209, 213, 219, 0.5) ${
                    (currentTime / duration) * 100
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