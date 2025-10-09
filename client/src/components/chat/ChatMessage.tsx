// components/chat/ChatMessage.tsx
import { FileText } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";

interface ChatMessageProps {
  message: {
    _id?: string;
    user: {
      _id: string;
      name?: string;
      email?: string;
      profilePicture?: string;
    };
    content: string;
    attachment?: string;
    mimeType?: string;
    createdAt: string | Date;
  };
  isOwnMessage: boolean;
}

function formatChatTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const attachment = message.attachment || "";
  const mimeType = message.mimeType || "";

  const isAudio = mimeType.startsWith("audio/") || mimeType === "video/webm" || mimeType === "audio/webm";
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/") && mimeType !== "video/webm";
  const isGenericFile = attachment && !isAudio && !isImage && !isVideo;

  const bgColor = isOwnMessage
    ? "bg-blue-500 text-white"
    : "bg-gray-100 text-gray-900";

  return (
    <div
      className={`flex gap-2 mb-3 ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div className={`px-4 py-2 rounded-lg ${bgColor} max-w-[75%]`}>
        {!isOwnMessage && (
          <p className="text-xs font-semibold mb-1 opacity-75">
            {message.user.name || "User"}
          </p>
        )}

        {/* Audio attachment */}
        {isAudio && attachment && (
          <AudioPlayer audioUrl={attachment} isOwnMessage={isOwnMessage} />
        )}

        {/* Image attachment - REDUCED SIZE */}
        {isImage && attachment && (
          <img
            src={attachment}
            alt="Attachment"
            className="max-w-[200px] max-h-[200px] rounded cursor-pointer hover:opacity-90 transition-opacity mb-2"
            onClick={() => window.open(attachment, "_blank")}
            onError={(e) => {
              console.error("Image load failed:", attachment);
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        {/* Video attachment - REDUCED SIZE */}
        {isVideo && attachment && (
          <video
            src={attachment}
            controls
            className="max-w-[200px] max-h-[200px] rounded mb-2"
          >
            Your browser doesn't support video playback.
          </video>
        )}

        {/* Generic file attachment */}
        {isGenericFile && (
          <a
            href={attachment}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 text-sm hover:underline mb-2 ${isOwnMessage ? '!text-white' : '!text-gray-900'}`}
          >
            <FileText size={16} />
            {(mimeType || "").includes("pdf") ? "View PDF" : "View File"}
          </a>
        )}

        {/* Text content */}
        {message.content && (
          <p className="text-sm break-words whitespace-pre-wrap mb-1">
            {message.content}
          </p>
        )}

        {/* Timestamp */}
        <p className={`text-xs ${isOwnMessage ? "opacity-70" : "opacity-60"}`}>
          {formatChatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}