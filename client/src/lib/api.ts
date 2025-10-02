const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api";

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
  _id:string,
  ticketId: string;
  department: "IT" | "dev-ops" | "software" | "networking" | "cyber-security"|"NA";
  subject: string;
  description: string;
  type: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  accepted: boolean;
  createdAt: string;
  updatedAt: string;
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
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface NewTicketData {
  description: string;
  department: string;
  priority: string;
  useremail: string; // This should come from your authenticated user session.
  assignedemail?: string;
}
export const ticketsApi = {
  getAll: () => fetchApi<Ticket[]>(`/ticket`),
  getAllDepartment: (department: string) =>
    fetchApi<Ticket[]>(`/ticket/department/${department}`),
  getById: async (id: string): Promise<Ticket> => {
    const endpoint = `/ticket/${id}`;
    const response = await fetchApi<ApiResponse<Ticket>>(endpoint);
    return response.data;
  },

  getMyTickets: (userId: string) =>
    fetchApi<Ticket[]>(`/ticket/assigned/${userId}`),
  create: async (ticketData: NewTicketData): Promise<Ticket> => {
    const response = await fetchApi<ApiResponse<Ticket>>("/ticket", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
    return response.data;
  },
  getStats: () => fetchApi<TicketStats>("/tickets/stats"),
  acceptTicket: (ticketId: string, userId: string) =>
    fetchApi<Ticket>(`/ticket/accept/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  resolveTicket: (ticketId: string) =>
    fetchApi<Ticket>(`/ticket/resolve/${ticketId}`, {
      method: "POST",
    }),
  ticketStats: () => fetchApi<TicketStats>("/tickets/stats"),
  updateStatus: (ticketId: string, status: string) =>
    fetchApi<Ticket>(`/ticket/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export const commentsApi = {
  getByTicket: (ticketId: string) =>
    fetchApi<Comment[]>(`/ticket/${ticketId}/comments`),

  create: (ticketId: string, content: string, userId: string) =>
    fetchApi<Comment>(`/ticket/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, userId }),
    }),
};

export const activitiesApi = {
  getByTicket: (ticketId: string) =>
    fetchApi<Activity[]>(`/tickets/${ticketId}/activities`),
};
