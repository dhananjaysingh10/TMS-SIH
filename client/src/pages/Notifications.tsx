//notification.tsx
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { selectCurrentUser } from "../redux/user/userSlice";
import {
  formatNotificationTime,
  useNotificationsFeed,
} from "../hooks/useNotificationsFeed";
import type { NotificationCategory } from "../hooks/useNotificationsFeed";
import { Bell, Inbox, RefreshCw } from "lucide-react";

type FilterValue = "all" | NotificationCategory;

const categoryStyles: Record<
  NotificationCategory,
  { label: string; badge: string }
> = {
  assigned: { label: "Assigned to me", badge: "bg-blue-50 text-blue-700" },
  created: { label: "Created by me", badge: "bg-emerald-50 text-emerald-700" },
  department: {
    label: "Department activity",
    badge: "bg-amber-50 text-amber-700",
  },
  message: {
    label: "Chat message",
    badge: "bg-purple-50 text-purple-700",
  },
  comment: {
    label: "Comment",
    badge: "bg-indigo-50 text-indigo-700",
  },
  activity: {
    label: "Activity",
    badge: "bg-teal-50 text-teal-700",
  },
};

export default function NotificationsPage() {
  const currentUser = useSelector(selectCurrentUser);
  const { notifications, loading, error, refresh } =
    useNotificationsFeed(currentUser);
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "assigned" || filter === "created") {
      // Filter by source for assigned/created to include all related notifications
      return notifications.filter((notification) => notification.source === filter);
    }
    return notifications.filter((notification) => notification.category === filter);
  }, [filter, notifications]);

  return (
    <Layout pageTitle="Notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 text-sm">
              Stay on top of ticket activity, comments, and assignments.
            </p>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} className="text-gray-500" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "assigned", "created"] as FilterValue[]).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
                filter === value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {value === "all"
                ? "All"
                : categoryStyles[value as NotificationCategory].label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {loading && (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="flex justify-center mb-4">
                <Bell className="animate-pulse text-blue-500" size={32} />
              </div>
              Loading notifications...
            </div>
          )}

          {!loading && error && (
            <div className="px-6 py-4 text-sm text-red-600 border-b border-gray-100">
              {error}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="flex justify-center mb-4">
                <Inbox size={36} className="text-gray-300" />
              </div>
              {filter === "all"
                ? "You have no notifications yet."
                : "Nothing to show for this category."}
            </div>
          )}

          <ul className="divide-y divide-gray-100">
            {filtered.map((notification) => {
              const meta = categoryStyles[notification.category];
              return (
                <li
                  key={notification.id}
                  className="px-6 py-5 flex flex-col gap-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatNotificationTime(notification.timestamp)}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {notification.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">
                      Status: {notification.status?.replace("-", " ")}
                    </span>
                    <span className="uppercase">
                      Priority: {notification.priority}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Link
                      to={notification.link}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View ticket →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

