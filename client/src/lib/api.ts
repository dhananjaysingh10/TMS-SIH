const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

interface ApiError {
  message: string;
  status: number;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `API Error: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "network" | "software" | "hardware" | "access" | "other";
  requester: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    full_name: string;
    email: string;
  };
  accepted: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user: {
    id: string;
    full_name: string;
  };
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  ticket_id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export type TicketStats = {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
};

export const ticketsApi = {
  getAll: () => fetchApi<Ticket[]>("/tickets"),

  getById: (id: string) => fetchApi<Ticket>(`/tickets/${id}`),

  getMyTickets: (userId: string) =>
    fetchApi<Ticket[]>(`/tickets/assigned/${userId}`),

  getStats: () => fetchApi<TicketStats>("/tickets/stats"),

  acceptTicket: (ticketId: string, userId: string) =>
    fetchApi<Ticket>(`/tickets/${ticketId}/accept`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  resolveTicket: (ticketId: string) =>
    fetchApi<Ticket>(`/tickets/${ticketId}/resolve`, {
      method: "POST",
    }),
  ticketStats: () => fetchApi<TicketStats>("/tickets/stats"),
  updateStatus: (ticketId: string, status: string) =>
    fetchApi<Ticket>(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export const commentsApi = {
  getByTicket: (ticketId: string) =>
    fetchApi<Comment[]>(`/tickets/${ticketId}/comments`),

  create: (ticketId: string, content: string, userId: string) =>
    fetchApi<Comment>(`/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, userId }),
    }),
};

export const activitiesApi = {
  getByTicket: (ticketId: string) =>
    fetchApi<Activity[]>(`/tickets/${ticketId}/activities`),
};
