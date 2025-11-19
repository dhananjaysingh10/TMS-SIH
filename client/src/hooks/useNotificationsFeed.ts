import { useCallback, useEffect, useMemo, useState } from "react";
import { ticketsApi, chatApi, commentsApi, activitiesApi, type Ticket, type Message, type Activity } from "../lib/api";

export type NotificationCategory = "assigned" | "created" | "department" | "message" | "comment" | "activity";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: NotificationCategory;
  link: string;
  ticketId?: string;
  status?: string;
  priority?: string;
  isNew: boolean;
  source?: "assigned" | "created" | "department";
}

type CurrentUser = {
  _id?: string;
  id?: string;
  email?: string;
  department?: string;
  name?: string;
  telegramId?: string;
};

const MAX_ITEMS = 30;
const TWO_DAYS_IN_MS = 1000 * 60 * 60 * 48;

const normalizeTickets = (payload: unknown): Ticket[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object") {
    const data = (payload as { data?: Ticket[]; tickets?: Ticket[] }).data;
    if (Array.isArray(data)) return data;
    const tickets = (payload as { tickets?: Ticket[] }).tickets;
    if (Array.isArray(tickets)) return tickets;
  }
  return [];
};

const buildNotification = (
  ticket: Ticket,
  category: NotificationCategory,
  customDescription?: string,
  customTimestamp?: string,
  customId?: string,
  source?: "assigned" | "created" | "department"
): NotificationItem => {
  const timestamp = customTimestamp || ticket.updatedAt || ticket.createdAt;
  const isNew = Date.now() - new Date(timestamp).getTime() < TWO_DAYS_IN_MS;

  let description = customDescription;
  if (!description) {
    if (category === "assigned") {
      description = `Ticket ${ticket.ticketId} was assigned to you`;
    } else if (category === "created") {
      description = `Ticket ${ticket.ticketId} is now ${ticket.status?.replace("-", " ")}`;
    } else {
      description = `New ${ticket.priority} priority ticket in ${ticket.department}`;
    }
  }

  return {
    id: customId || `${category}-${ticket._id}`,
    title: ticket.title || "Ticket update",
    description,
    timestamp,
    category,
    link: `/ticket/${ticket.ticketId}`,
    ticketId: ticket.ticketId,
    status: ticket.status,
    priority: ticket.priority,
    isNew,
    source: source || (category === "assigned" ? "assigned" : category === "created" ? "created" : category === "department" ? "department" : undefined),
  };
};

export const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export function useNotificationsFeed(currentUser: CurrentUser | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const userId = currentUser?._id || currentUser?.id;
    if (!currentUser?.email && !userId) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [assigned, created, department] = await Promise.all([
        currentUser.email ? ticketsApi.getMyTickets(currentUser.email) : [],
        userId
          ? ticketsApi.getAll(`/ticket/createdBy/${userId}?limit=50`)
          : [],
        currentUser.department
          ? ticketsApi.getAllDepartment(currentUser.department)
          : [],
      ]);

      const createdTickets = normalizeTickets(created);
      const departmentTickets = normalizeTickets(department);
      const assignedTickets = normalizeTickets(assigned);

      // Get all unique ticket IDs we need to check for messages/comments/activities
      const allRelevantTickets = [
        ...assignedTickets,
        ...createdTickets,
        ...departmentTickets.filter(
          (ticket) =>
            ticket.createdBy?.id !== userId &&
            ticket.createdBy?.email !== currentUser?.email
        ),
      ];
      const uniqueTicketIds = Array.from(
        new Set(allRelevantTickets.map((t) => t.ticketId))
      );

      // Fetch messages, comments, and activities for all relevant tickets
      const ticketDetailsPromises = uniqueTicketIds.map(async (ticketId) => {
        try {
          const [messages, comments, activities] = await Promise.allSettled([
            chatApi.getByTicketId(ticketId).catch(() => []),
            commentsApi.getByTicket(ticketId).catch(() => []),
            activitiesApi.getByTicket(ticketId).catch(() => []),
          ]);

          return {
            ticketId,
            messages:
              messages.status === "fulfilled" ? messages.value : [],
            comments:
              comments.status === "fulfilled" ? comments.value : [],
            activities:
              activities.status === "fulfilled" ? activities.value : [],
          };
        } catch (err) {
          return {
            ticketId,
            messages: [],
            comments: [],
            activities: [],
          };
        }
      });

      const ticketDetails = await Promise.all(ticketDetailsPromises);
      const detailsMap = new Map(
        ticketDetails.map((d) => [d.ticketId, d])
      );

      // Helper function to check if action is from current user
      const isFromCurrentUser = (user: any) => {
        if (!user || !currentUser) return false;
        const currentUserId = currentUser._id || currentUser.id;
        const actionUserId = user._id || user.id;
        
        // Check email (primary), ID, and telegramId
        const emailMatch = user.email && currentUser.email && user.email.toLowerCase() === currentUser.email.toLowerCase();
        const idMatch = actionUserId && currentUserId && actionUserId === currentUserId;
        const telegramMatch = user.telegramId && currentUser.telegramId && user.telegramId === currentUser.telegramId;
        
        return emailMatch || idMatch || telegramMatch;
      };

      // Build notifications for assigned tickets
      const assignedNotifications: NotificationItem[] = [];
      assignedTickets.forEach((ticket) => {
        const details = detailsMap.get(ticket.ticketId);
        const ticketNotifications: NotificationItem[] = [];
        
        // Check for new messages (not from current user)
        if (details?.messages && details.messages.length > 0) {
          const recentMessages = details.messages
            .filter(
              (msg: Message) =>
                !isFromCurrentUser(msg.user) &&
                Date.now() - new Date(msg.createdAt).getTime() < TWO_DAYS_IN_MS
            )
            .sort(
              (a: Message, b: Message) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

          // Add notification for EACH message, not just the latest
          recentMessages.forEach((msg: Message) => {
            ticketNotifications.push(
              buildNotification(
                ticket,
                "message",
                `${msg.user?.name || "Someone"} sent a message in chat`,
                msg.createdAt,
                `message-${ticket.ticketId}-${msg._id}`,
                "assigned"
              )
            );
          });
        }

        // Check for new comments (not from current user)
        if (details?.comments && details.comments.length > 0) {
          const recentComments = details.comments
            .filter(
              (comment: Message) =>
                !isFromCurrentUser(comment.user) &&
                Date.now() - new Date(comment.createdAt).getTime() < TWO_DAYS_IN_MS
            )
            .sort(
              (a: Message, b: Message) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

          if (recentComments.length > 0) {
            const latestComment = recentComments[0];
            ticketNotifications.push(
              buildNotification(
                ticket,
                "comment",
                `${latestComment.user?.name || "Someone"} added a comment`,
                latestComment.createdAt,
                `comment-${ticket.ticketId}-${latestComment._id}`,
                "assigned"
              )
            );
          }
        }

        // Check for recent activities (not from current user)
        if (details?.activities && details.activities.length > 0) {
          const recentActivities = details.activities
            .filter(
              (activity: Activity) =>
                !isFromCurrentUser(activity.user) &&
                Date.now() - new Date(activity.timestamp).getTime() < TWO_DAYS_IN_MS
            )
            .sort(
              (a: Activity, b: Activity) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

          if (recentActivities.length > 0) {
            const latestActivity = recentActivities[0];
            ticketNotifications.push(
              buildNotification(
                ticket,
                "activity",
                latestActivity.description,
                latestActivity.timestamp,
                `activity-${ticket.ticketId}-${latestActivity._id}`,
                "assigned"
              )
            );
          }
        }

        // Only add ticket notifications if there are specific activities from others
        // If there are no specific notifications, don't add the generic "assigned to you" message
        if (ticketNotifications.length > 0) {
          assignedNotifications.push(...ticketNotifications);
        }
      });

      // Build notifications for created tickets - ONLY chat messages from others
      const createdNotifications: NotificationItem[] = [];
      createdTickets.forEach((ticket) => {
        const details = detailsMap.get(ticket.ticketId);
        
        // Check for new messages (not from current user)
        if (details?.messages && details.messages.length > 0) {
          const recentMessages = details.messages
            .filter(
              (msg: Message) =>
                !isFromCurrentUser(msg.user) &&
                Date.now() - new Date(msg.createdAt).getTime() < TWO_DAYS_IN_MS
            )
            .sort(
              (a: Message, b: Message) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

          if (recentMessages.length > 0) {
            const latestMsg = recentMessages[0];
            createdNotifications.push(
              buildNotification(
                ticket,
                "message",
                `${latestMsg.user?.name || "Someone"} sent a message in chat`,
                latestMsg.createdAt,
                `message-${ticket.ticketId}-${latestMsg._id}`,
                "created"
              )
            );
          }
        }
      });

      // Build notifications for department tickets - ONLY newly created tickets by others
      const departmentNotifications = departmentTickets
        .filter(
          (ticket) => {
            // Only show tickets not created by current user
            const notCreatedByMe = !isFromCurrentUser(ticket.createdBy);
            
            // Only show tickets that were created recently (within 2 days)
            const ticketCreatedAt = new Date(ticket.createdAt).getTime();
            const isNewlyCreated = Date.now() - ticketCreatedAt < TWO_DAYS_IN_MS;
            
            return notCreatedByMe && isNewlyCreated;
          }
        )
        .map((ticket) =>
          buildNotification(
            ticket,
            "department",
            `New ticket ${ticket.ticketId} opened in ${ticket.department}`,
            ticket.createdAt,
            undefined,
            "department"
          )
        );

      const combined = [
        ...assignedNotifications,
        ...createdNotifications,
        ...departmentNotifications,
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, MAX_ITEMS);

      setNotifications(combined);
    } catch (err) {
      console.error("Failed to load notifications", err);
      setError("Unable to load notifications right now.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isNew).length,
    [notifications]
  );

  return {
    notifications,
    loading,
    error,
    refresh: fetchNotifications,
    unreadCount,
  };
}