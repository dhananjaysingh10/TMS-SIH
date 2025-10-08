// components/chat/FileAttachment.tsx
import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

interface FileAttachmentProps {
  ticketId: string;
  additionalText?: string;
  onSendSuccess: () => void;
  disabled?: boolean;
  onFileSelected?: (file: File | null, previewUrl: string | null) => void;
}

export interface FileAttachmentRef {
  sendFile: () => Promise<void>;
}

export const FileAttachment = forwardRef<FileAttachmentRef, FileAttachmentProps>(
  ({ ticketId, additionalText = "", onSendSuccess, disabled = false, onFileSelected }, ref) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);

        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const preview = reader.result as string;
            setPreviewUrl(preview);
            onFileSelected?.(file, preview);
          };
          reader.readAsDataURL(file);
        } else {
          setPreviewUrl(null);
          onFileSelected?.(file, null);
        }
      }
    };

    const clearFileSelection = () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      onFileSelected?.(null, null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const sendFileMessage = async () => {
      if (!selectedFile) return;

      setIsSending(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        if (additionalText.trim()) {
          formData.append("content", additionalText.trim());
        }

        console.log("Sending file:", {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        });

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"}/messages/${ticketId}/messages`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
          throw new Error(errorData.message || "Failed to send file");
        }

        const result = await response.json();
        console.log("File sent successfully:", result);

        clearFileSelection();
        toast.success("File sent successfully");
        onSendSuccess();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Failed to send file:", msg);
        toast.error("Failed to send file: " + msg);
      } finally {
        setIsSending(false);
      }
    };

    // Expose sendFile method to parent via ref
    useImperativeHandle(ref, () => ({
      sendFile: sendFileMessage,
    }));

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Attach file"
        >
          {isSending ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>
      </>
    );
  }
);

FileAttachment.displayName = "FileAttachment";