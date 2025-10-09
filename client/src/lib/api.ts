//api.ts
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
      credentials: "include",
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

// export type ChatUser = {
//   _id: string;
//   username?: string;
//   name?: string;
//   email?: string;
// };

// export type ChatMessage = {
//   _id?: string;
//   userId: ChatUser;
//   content: string;
//   attachments?: string[];
//   createdAt: string;
// };

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
  title: string;
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
  _id: string;
  user: {
    _id: string;
    name: string;
    email?: string;
  };
  description: string;
  timestamp: string;
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
  title: string;
  department: string;
  priority: string;
  useremail: string;
  assignedemail?: string;
}
interface Pagination {
  total: number; // Total number of tickets in the category or result set
  page: number; // Current page number
  limit: number; // Number of tickets per page
  totalPages: number; // Total number of pages, calculated as Math.ceil(total / limit)
}
export const ticketsApi = {
  getAll: async (searchTerm: string = "") => {
    console.log("here we go", searchTerm);
    const endpoint = searchTerm
    //   ? `/ticket?search=${encodeURIComponent(searchTerm)}&limit=10`
    //   : `/ticket?search=&limit=1000`;
    // const response = await fetchApi<Ticket[]>(endpoint);
    const response = await fetchApi<Ticket[] | { tickets: Ticket[]; pagination: Pagination }>(endpoint);
    return response;
  },
  getAllDepartment: (department: string) =>
    fetchApi<Ticket[]>(`/ticket/department/${department}`),
  getById: async (id: string): Promise<Ticket> => {
    const endpoint = `/ticket/${id}`;
    const response = await fetchApi<ApiResponse<Ticket>>(endpoint);
    return response.data;
  },

  // getCreatedBy: async (userId: string): Promise<Ticket[]> => {
  //   console.log("API: getCreatedBy called with userId:", userId);
  //   try {
  //     const response = await fetchApi<any>(`/ticket/createdBy/${userId}`);
  //     console.log("API: getCreatedBy response:", response);
  //     return response.data || [];
  //   } catch (error) {
  //     console.error("API: getCreatedBy error:", error);
  //     throw error;
  //   }
  // },
  getCreatedBy: async (endpoint: string): Promise<Ticket[] | { tickets: Ticket[]; pagination: Pagination }> => {
    console.log("API: getCreatedBy called with endpoint:", endpoint);
    try {
      const response = await fetchApi<Ticket[] | { tickets: Ticket[]; pagination: Pagination }>(endpoint);
      console.log("API: getCreatedBy response:", response);
      return response;
    } catch (error) {
      console.error("API: getCreatedBy error:", error);
      throw error;
    }
  },

  //   getMyTickets: async (
  //   email: string,
  //   searchTerm: string = ""
  // ): Promise<Ticket[]> => {
  //   const endpoint = `/ticket/assignedto?search=${encodeURIComponent(
  //     searchTerm
  //   )}&limit=1000`;
  //   const payload = { email };
  //   const response = await fetchApi<ApiResponse<Ticket[]>>(endpoint, {
  //     method: "POST",
  //     body: JSON.stringify(payload),
  //   });
  //   return response.data;
  // },
  getMyTickets: async (email: string, searchTerm: string = ""): Promise<Ticket[]> => {
    const endpoint = `/ticket/assignedto?search=${encodeURIComponent(searchTerm)}&limit=1000`;
    console.log("API: getMyTickets called with endpoint:", endpoint, "email:", email);
    try {
      const response = await fetchApi<ApiResponse<Ticket[]>>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      console.log("API: getMyTickets response:", response);
      return response.data;
    } catch (error) {
      console.error("API: getMyTickets error:", error);
      throw error;
    }
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

  unacceptTicket: (ticketId: string, useremail: string) =>
    fetchApi<Ticket>(`/ticket/unaccept/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ useremail }),
    }),

  openTicket: (ticketId: string, useremail: string) =>
    fetchApi<Ticket>(`/ticket/open/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ useremail }),
    }),

  resolveTicket: (ticketId: string, useremail: string) =>
    fetchApi<Ticket>(`/ticket/resolve/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ useremail }),
    }),
  ticketStats: () => fetchApi<TicketStats>("/tickets/stats"),
  updateStatus: (ticketId: string, status: string) =>
    fetchApi<Ticket>(`/ticket/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export const chatApi = {
  getByTicketId: async (ticketId: string): Promise<Message[]> => {
    return fetchApi(`/messages/${ticketId}/messages`);
  },
  send: async (
    ticketId: string,
    body: { content: string; attachment?: string }
  ) => {
    return fetchApi(`/messages/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
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
  getByTicket: async (ticketId: string): Promise<Activity[]> => {
    const response = await fetchApi<ApiResponse<Activity[]>>(
      `/ticket/activities/${ticketId}`
    );
    return response.data;
  },
};
