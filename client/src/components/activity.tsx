import {
  FilePlus2,
  GitBranch,
  MessageSquare,
  Activity as ActivityIcon,
} from "lucide-react";
import { type Activity } from "../lib/api";

const getActivityIcon = (description:string = "") => {
  const desc = description.toLowerCase();
  if (desc.includes("created the ticket")) {
    return <FilePlus2 className="text-green-600" size={16} />;
  }
  if (desc.includes("changed status")) {
    return <GitBranch className="text-blue-600" size={16} />;
  }
  if (desc.includes("added a new message")) {
    return <MessageSquare className="text-purple-600" size={16} />;
  }
  return <ActivityIcon className="text-gray-600" size={16} />;
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export default function ActivityTimeline({
  activities,
}: ActivityTimelineProps) {
  return (
    <div className="p-4 bg-gray-50/50 rounded-lg max-h-[450px] overflow-y-auto">
      {activities.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-500 text-sm">No activities to display</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-200 ml-4">
          {activities.map((activity) => (
            <div key={activity._id} className="mb-8 pl-8 relative">
              <div className="absolute -left-[18px] top-0 h-8 w-8 bg-white flex items-center justify-center rounded-full ring-4 ring-white">
                {getActivityIcon(activity.description)}
              </div>
              <div className="pl-2">
                <p className="text-sm text-gray-800 leading-relaxed">
                  <span className="font-semibold text-gray-900">
                    {activity.user?.name}
                  </span>{" "}
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
