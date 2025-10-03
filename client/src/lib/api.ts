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
  _id: string;
  ticketId: string;
  department:
    | "IT"
    | "dev-ops"
    | "software"
    | "networking"
    | "cyber-security"
    | "NA";
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

export interface Message {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  content: string;
  attachment?: string;
  createdAt: string;
}

export interface NewMessageData {
  useremail: string;
  content: string;
  attachment?: string;
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

  getMyTickets: async (email: string): Promise<Ticket[]> => {
    const payload={email}
    const response = await fetchApi<ApiResponse<Ticket[]>>(
      "/ticket/assignedto",
      {
        method: "POST", 
        body: JSON.stringify(payload),
      }
    );

    return response.data;
  },
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
  getByTicket: async (ticketId: string): Promise<Message[]> => {
    const response = await fetchApi<ApiResponse<Message[]>>(
      `/ticket/getmessage/${ticketId}`
    );
    return response.data;
  },

  /**
   * Creates a new message and adds it to a ticket.
   * @param ticketId The ID of the ticket to add the message to.
   * @param messageData The payload containing the message details.
   */
  create: async (
    ticketId: string,
    messageData: NewMessageData
  ): Promise<Message> => {
    const response = await fetchApi<ApiResponse<Message>>(
      `/ticket/message/${ticketId}`,
      {
        method: "POST",
        body: JSON.stringify(messageData),
      }
    );
    return response.data;
  },
};

export const activitiesApi = {
  getByTicket: (ticketId: string) =>
    fetchApi<Activity[]>(`/ticket/${ticketId}/activities`),
};
