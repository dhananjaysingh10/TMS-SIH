// components/chat/FilePreview.tsx
import { FileText, X } from "lucide-react";

interface FilePreviewProps {
  file: File;
  previewUrl: string | null;
  onClear: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function FilePreview({ file, previewUrl, onClear }: FilePreviewProps) {
  return (
    <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
              <FileText size={20} className="text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}