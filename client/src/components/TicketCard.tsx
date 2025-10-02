import { Clock, User } from "lucide-react";
import { Link } from "react-router-dom";

// The props are now a 1:1 match with your Mongoose schema.
// This is the correct way to ensure front-end/back-end consistency.
interface TicketCardProps {
  _id: string; // Changed from 'id' to '_id' for clarity
  ticketId: string; // Changed from 'ticketNumber'
  description: string; // Changed from 'subject'
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high"; // 'urgent' was removed as it's not in the schema
  department: // Changed from 'category'
  "IT" | "dev-ops" | "software" | "networking" | "cyber-security" | "NA";
  createdBy: {
    // Changed from 'requester' to represent the populated field
    name: string;
    email: string;
  };
  assignedTo?: {
    name: string;
  };
  createdAt: string;
  accepted?: boolean;
}

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
};

const statusColors = {
  open: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700", // Key updated to match schema
  resolved: "bg-purple-100 text-purple-700",
  closed: "bg-gray-100 text-gray-600",
};

// Renamed from 'categoryColors' and updated to match the 'department' enum
const departmentColors = {
  IT: "bg-cyan-100 text-cyan-700",
  "dev-ops": "bg-indigo-100 text-indigo-700",
  software: "bg-purple-100 text-purple-700",
  networking: "bg-amber-100 text-amber-700",
  "cyber-security": "bg-red-100 text-red-700",
  NA: "bg-slate-100 text-slate-700",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

export default function TicketCard({
  _id,
  ticketId,
  description,
  status,
  priority,
  department,
  createdBy,
  assignedTo,
  createdAt,
  accepted,
}: TicketCardProps) {
  const isUnaccepted = !accepted;

  return (
    <Link
      to={`/ticket/${_id}`} // Link now uses _id
      className={`block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        isUnaccepted ? "border-l-4 border-l-orange-400" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-blue-600">#{ticketId}</span>
            {isUnaccepted && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                Unclaimed
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 leading-snug">
            {description}
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[status]}`}
        >
          {status.replace("-", " ").toUpperCase()}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColors[priority]}`}
        >
          {priority.toUpperCase()}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${departmentColors[department]}`}
        >
          {department.replace("-", " ").toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <User size={14} className="text-gray-400" />
          <span className="text-xs">
            Requester: <span className="font-medium">{createdBy.name}</span>
          </span>
        </div>

        {assignedTo && (
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span className="text-xs">
              Assigned to:{" "}
              <span className="font-medium">{assignedTo.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">{formatDate(createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
