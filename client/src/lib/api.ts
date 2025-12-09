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
  displayId?: string;
  department: string;  // Dynamic team name (e.g., "Vendor Onboarding & Reg")
  departmentRef?: {
    _id: string;
    name: string;
    product: {
      _id: string;
      name: string;
    };
  };
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
  inreview: boolean;
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
    const endpoint = searchTerm;
    const response = await fetchApi<Ticket[]>(endpoint);
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
  getCreatedBy: async (
    endpoint: string
  ): Promise<Ticket[] | { tickets: Ticket[]; pagination: Pagination }> => {
    console.log("API: getCreatedBy called with endpoint:", endpoint);
    try {
      const response = await fetchApi<
        Ticket[] | { tickets: Ticket[]; pagination: Pagination }
      >(endpoint);
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
  getMyTickets: async (
    email: string,
    searchTerm: string = ""
  ): Promise<Ticket[]> => {
    const endpoint = `/ticket/assignedto?search=${encodeURIComponent(
      searchTerm
    )}&limit=1000`;
    console.log(
      "API: getMyTickets called with endpoint:",
      endpoint,
      "email:",
      email
    );
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
  createFrontend: async (ticketData: NewTicketData): Promise<any> => {
    const response = await fetchApi<any>("/ticket/frontend", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
    return response;
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

  openTicket: (ticketId: string, useremail: string, remark: string) =>
    fetchApi<Ticket>(`/ticket/open/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ useremail, remark }),
    }),

  resolveTicket: (ticketId: string, useremail: string, remark: string) =>
    fetchApi<Ticket>(`/ticket/resolve/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ useremail, remark }),
    }),
  requestChange: (ticketId: string, useremail: string, remark: string) =>
    fetchApi<Ticket>(`/ticket/request/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ useremail, remark }),
    }),
  ticketStats: () => fetchApi<TicketStats>("/tickets/stats"),
  updateStatus: (ticketId: string, status: string) =>
    fetchApi<Ticket>(`/ticket/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  // Get tickets pending department change (inreview: true)
  getTicketsInReview: async (): Promise<Ticket[]> => {
    const response = await fetchApi<{ success: boolean; tickets: Ticket[] }>('/ticket/in-review');
    return response.tickets;
  },
  // Approve department change - reassign to new department
  approveDepartmentChange: async (ticketId: string, departmentId: string): Promise<Ticket> => {
    const response = await fetchApi<{ success: boolean; ticket: Ticket }>(`/ticket/${ticketId}/approve-department-change`, {
      method: 'PUT',
      body: JSON.stringify({ departmentId }),
    });
    return response.ticket;
  },
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

// Analytics API for Admin Dashboard
export interface DepartmentAnalytics {
  department: string;
  range: string;
  startDate: string;
  endDate: string;
  ticketVolume: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  typeBreakdown: Record<string, number>;
  avgResolutionTimeHours: number;
  resolutionDistribution: {
    under4h: number;
    under24h: number;
    under3d: number;
    over3d: number;
  };
  avgAcceptanceTimeHours: number;
}

export interface EmployeeStats {
  employee: {
    _id: string;
    name: string;
    email: string;
    profilePicture: string;
  };
  ticketStats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  avgResolutionTimeHours: number;
  avgRating: number | null;
  currentWorkload: number;
}

export interface EmployeesAnalytics {
  department: string;
  range: string;
  startDate: string;
  endDate: string;
  employees: EmployeeStats[];
}

export interface SingleEmployeeAnalytics {
  employee: {
    _id: string;
    name: string;
    email: string;
    profilePicture: string;
    department: string;
  };
  range: string;
  startDate: string;
  endDate: string;
  ticketStats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  avgResolutionTimeHours: number;
  customerSatisfaction: {
    avgRating: number | null;
    totalRated: number;
  };
  currentWorkload: number;
  recentTickets: Array<{
    ticketId: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    rating: number;
  }>;
}

export interface ProductStats {
  product: string;
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface ProductsAnalytics {
  range: string;
  startDate: string;
  endDate: string;
  products: ProductStats[];
}

export const analyticsApi = {
  getDepartment: async (range: string = '1m'): Promise<DepartmentAnalytics> => {
    const response = await fetchApi<ApiResponse<DepartmentAnalytics>>(
      `/analytics/department?range=${range}`
    );
    return response.data;
  },

  getEmployees: async (range: string = '1m', productId?: string): Promise<EmployeesAnalytics> => {
    const params = new URLSearchParams({ range });
    if (productId) params.append('productId', productId);
    const response = await fetchApi<ApiResponse<EmployeesAnalytics>>(
      `/analytics/employees?${params.toString()}`
    );
    return response.data;
  },

  getSingleEmployee: async (employeeId: string, range: string = '1m'): Promise<SingleEmployeeAnalytics> => {
    const response = await fetchApi<ApiResponse<SingleEmployeeAnalytics>>(
      `/analytics/employee/${employeeId}?range=${range}`
    );
    return response.data;
  },

  getProducts: async (range: string = '1m'): Promise<ProductsAnalytics> => {
    const response = await fetchApi<ApiResponse<ProductsAnalytics>>(
      `/analytics/products?range=${range}`
    );
    return response.data;
  },
};

// ============== Users API ==============

export interface UserBasic {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role?: string;
}

export const usersApi = {
  getAll: async (): Promise<UserBasic[]> => {
    const response = await fetchApi<{ success: boolean; data: UserBasic[] }>('/user');
    return response.data;
  },
  getMyProducts: async (): Promise<{ _id: string; name: string }[]> => {
    const response = await fetchApi<{ success: boolean; products: { _id: string; name: string }[] }>('/user/my-products');
    return response.products;
  },
};

// ============== Product & Department Types ==============

export interface Product {
  _id: string;
  name: string;
  description: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentMember {
  _id: string;
  name: string;
  email: string;
  profilePicture: string;
  role?: string;
}

export interface Department {
  _id: string;
  name: string;
  product: {
    _id: string;
    name: string;
  };
  description: string;
  keywords: string[];
  members: DepartmentMember[];
  lead: DepartmentMember | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithDepartments {
  product: Product;
  departments: Department[];
}

// ============== Product API ==============

export const productApi = {
  getAll: async (active?: boolean): Promise<Product[]> => {
    const query = active !== undefined ? `?active=${active}` : '';
    const response = await fetchApi<ApiResponse<Product[]>>(`/products${query}`);
    return response.data;
  },

  getById: async (id: string): Promise<ProductWithDepartments> => {
    const response = await fetchApi<ApiResponse<ProductWithDepartments>>(`/products/${id}`);
    return response.data;
  },

  create: async (data: { name: string; description?: string }): Promise<Product> => {
    const response = await fetchApi<ApiResponse<Product>>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string; isActive?: boolean }): Promise<Product> => {
    const response = await fetchApi<ApiResponse<Product>>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await fetchApi(`/products/${id}`, { method: 'DELETE' });
  },

  setAdmin: async (productId: string, adminId: string | null): Promise<Product> => {
    const response = await fetchApi<ApiResponse<Product>>(`/products/${productId}/admin`, {
      method: 'PUT',
      body: JSON.stringify({ adminId }),
    });
    return response.data;
  },
};

// ============== Department API ==============

export const departmentApi = {
  getAll: async (productId?: string, active?: boolean): Promise<Department[]> => {
    const params = new URLSearchParams();
    if (productId) params.append('product', productId);
    if (active !== undefined) params.append('active', String(active));
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchApi<ApiResponse<Department[]>>(`/departments${query}`);
    return response.data;
  },

  getById: async (id: string): Promise<Department> => {
    const response = await fetchApi<ApiResponse<Department>>(`/departments/${id}`);
    return response.data;
  },

  getMyDepartments: async (): Promise<Department[]> => {
    const response = await fetchApi<ApiResponse<Department[]>>('/departments/my');
    return response.data;
  },

  create: async (data: { name: string; product: string; description?: string; leadId?: string; keywords?: string[] }): Promise<Department> => {
    const response = await fetchApi<ApiResponse<Department>>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string; leadId?: string; isActive?: boolean; keywords?: string[] }): Promise<Department> => {
    const response = await fetchApi<ApiResponse<Department>>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await fetchApi(`/departments/${id}`, { method: 'DELETE' });
  },

  addMember: async (id: string, memberId: string): Promise<void> => {
    await fetchApi(`/departments/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  },

  removeMember: async (id: string, memberId: string): Promise<void> => {
    await fetchApi(`/departments/${id}/members/${memberId}`, { method: 'DELETE' });
  },
};

// ============== Temporary Tickets API (Helpdesk) ==============

export interface ChatMessage {
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
}

export interface TemporaryTicket {
  _id: string;
  tempTicketId: string;
  userId: string | { _id: string, name: string, email: string };
  userEmail: string;
  issueTitle: string;
  issueContext: string;
  chatHistory: ChatMessage[];
  autoResolved: boolean;
  escalatedToTicket: boolean;
  permanentTicketId?: string;
  lastActivityAt: string;
  createdAt: string;
}

export const temporaryTicketsApi = {
  getUserTickets: async (userId: string, includeResolved: boolean = false): Promise<TemporaryTicket[]> => {
    const query = includeResolved ? '?includeResolved=true' : '';
    const response = await fetchApi<ApiResponse<TemporaryTicket[]>>(`/temporary-ticket/user/${userId}${query}`);
    return response.data;
  },

  getById: async (id: string): Promise<TemporaryTicket> => {
    const response = await fetchApi<ApiResponse<TemporaryTicket>>(`/temporary-ticket/${id}`);
    return response.data;
  },

  addMessage: async (id: string, role: 'user' | 'ai', message: string): Promise<{ tempTicketId: string, messageCount: number, escalated?: boolean, resolved?: boolean, aiReply?: string, latestMessage?: ChatMessage }> => {
    const response = await fetchApi<ApiResponse<{ tempTicketId: string, messageCount: number, escalated?: boolean, resolved?: boolean, aiReply?: string, latestMessage?: ChatMessage }>>(`/temporary-ticket/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ role, message }),
    });
    return response.data;
  },

  resolve: async (id: string): Promise<TemporaryTicket> => {
    const response = await fetchApi<ApiResponse<TemporaryTicket>>(`/temporary-ticket/${id}/resolve`, {
      method: 'POST',
    });
    return response.data;
  },

  escalate: async (id: string, issueTitle?: string, issueDescription?: string): Promise<{ tempTicketId: string, escalatedToTicket: boolean }> => {
    const response = await fetchApi<ApiResponse<{ tempTicketId: string, escalatedToTicket: boolean }>>(`/temporary-ticket/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ issueTitle, issueDescription }),
    });
    return response.data;
  }
};
