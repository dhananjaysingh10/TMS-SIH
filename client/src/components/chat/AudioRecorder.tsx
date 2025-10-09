// components/chat/AudioRecorder.tsx
import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

interface AudioRecorderProps {
  ticketId: string;
  onSendSuccess: () => void;
  disabled?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioRecorder({ ticketId, onSendSuccess, disabled = false, onRecordingChange }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingChange?.(true); // MOVED HERE - only notify after recording starts

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingChange?.(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"}/messages/${ticketId}/messages`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send audio");
      }

      toast.success("Audio sent successfully");
      onSendSuccess();
    } catch (error) {
      console.error("Failed to send audio:", error);
      toast.error("Failed to send audio");
    } finally {
      setIsSending(false);
      setRecordingTime(0);
    }
  };

  if (isRecording) {
    return (
      <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg w-full">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-700">
            Recording... {formatDuration(recordingTime)}
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          <Square size={18} fill="white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled || isSending}
      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      title="Record audio"
    >
      {isSending ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
    </button>
  );
}