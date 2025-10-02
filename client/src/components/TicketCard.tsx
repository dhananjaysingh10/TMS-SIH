import { Clock, User } from "lucide-react";
import { Link } from "react-router-dom";

interface TicketCardProps {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "network" | "software" | "hardware" | "access" | "other";
  requester: {
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
  urgent: "bg-red-100 text-red-700",
};

const statusColors = {
  open: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-purple-100 text-purple-700",
  closed: "bg-gray-100 text-gray-600",
};

const categoryColors = {
  network: "bg-cyan-100 text-cyan-700",
  software: "bg-indigo-100 text-indigo-700",
  hardware: "bg-amber-100 text-amber-700",
  access: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-700",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
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
  id,
  ticketNumber,
  subject,
  status,
  priority,
  category,
  requester,
  assignedTo,
  createdAt,
  accepted,
}: TicketCardProps) {
  const isUnaccepted = assignedTo && !accepted;

  return (
    <Link
      to={`/ticket/${id}`}
      className={`block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        isUnaccepted ? "border-l-4 border-l-orange-400" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-blue-600">
              #{ticketNumber}
            </span>
            {isUnaccepted && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                Unclaimed
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 leading-snug">
            {subject}
          </h3>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[status]}`}
        >
          {status.replace("_", " ").toUpperCase()}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColors[priority]}`}
        >
          {priority.toUpperCase()}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[category]}`}
        >
          {category.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <User size={14} className="text-gray-400" />
          <span className="text-xs">
            Requester: <span className="font-medium">{requester.name}</span>
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
