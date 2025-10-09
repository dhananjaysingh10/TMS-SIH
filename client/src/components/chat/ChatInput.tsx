// components/chat/ChatInput.tsx
import { useState, useRef } from "react";
import { Send, Loader2, X, FileText } from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import { FileAttachment} from "./FileAttachment";
import type { FileAttachmentRef} from "./FileAttachment";
import { toast } from "react-toastify";

interface ChatInputProps {
  ticketId: string;
  onMessageSent: () => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function ChatInput({ ticketId, onMessageSent, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false); // NEW
  const fileAttachmentRef = useRef<FileAttachmentRef>(null);

  const handleSendMessage = async () => {
    if (!ticketId) return;

    if (selectedFile) {
      await fileAttachmentRef.current?.sendFile();
      setMessage("");
      return;
    }

    if (!message.trim()) return;

    setIsSending(true);
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"}/messages/${ticketId}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message }),
        }
      );
      setMessage("");
      onMessageSent();
    } catch (e) {
      console.error("Send chat failed:", e);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelected = (file: File | null, preview: string | null) => {
    setSelectedFile(file);
    setPreviewUrl(preview);
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <>
      {selectedFile && (
        <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={clearFileSelection}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {isRecording ? (
          // Show only AudioRecorder when recording
          <AudioRecorder
            ticketId={ticketId}
            onSendSuccess={onMessageSent}
            disabled={disabled || isSending}
            onRecordingChange={setIsRecording}
          />
        ) : (
          // Show normal input layout when not recording
          <>
            <FileAttachment
              ref={fileAttachmentRef}
              ticketId={ticketId}
              additionalText={message}
              onSendSuccess={() => {
                setMessage("");
                setSelectedFile(null);
                setPreviewUrl(null);
                onMessageSent();
              }}
              disabled={disabled || isSending}
              onFileSelected={handleFileSelected}
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-[1_1_0%] min-w-0 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disabled || isSending}
              rows={2}
            />

            <AudioRecorder
              ticketId={ticketId}
              onSendSuccess={onMessageSent}
              disabled={disabled || isSending || selectedFile !== null}
              onRecordingChange={setIsRecording}
            />

            <button
              onClick={handleSendMessage}
              disabled={disabled || isSending || (!message.trim() && !selectedFile)}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </>
        )}
      </div>
    </>
  );
}