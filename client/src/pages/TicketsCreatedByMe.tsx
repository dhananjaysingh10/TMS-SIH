import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { ticketsApi, type Ticket } from "../lib/api";
import {
  AlertCircle,
  Clock,
  User,
  Search,
} from "lucide-react";
import useDebounce from "../hooks/debounce";

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusColors = {
  open: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  resolved: "bg-purple-100 text-purple-700",
  closed: "bg-gray-100 text-gray-600",
};

const departmentColors = {
  IT: "bg-cyan-100 text-cyan-700",
  DevOps: "bg-indigo-100 text-indigo-700",
  Software: "bg-purple-100 text-purple-700",
  Networking: "bg-amber-100 text-amber-700",
  Cybersecurity: "bg-red-100 text-red-700",
  Other: "bg-slate-100 text-slate-700",
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

export default function TicketsCreatedByMe() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    console.log("TicketsCreatedByMe useEffect - currentUser:", currentUser);
    if (currentUser?.id) {
      fetchCreatedTickets();
    } else {
      console.log("No currentUser.id found, setting loading to false");
      setLoading(false);
    }
  }, [currentUser]);

  async function fetchCreatedTickets() {
    if (!currentUser?.id) {
      setError("User ID not found");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching tickets for user ID:", currentUser.id);
      const data = await ticketsApi.getCreatedBy(currentUser.id);
      console.log("Received tickets data:", data);
      setTickets(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching created tickets:", err);
      setError("Failed to load your tickets");
    } finally {
      setLoading(false);
    }
  }

  const filteredTickets = debouncedSearchTerm
    ? tickets.filter((ticket) =>
        ticket.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        ticket.ticketId?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    : tickets;

  const openTickets = filteredTickets.filter(
    (t) => t.status === "in-progress" || t.status === "open"
  );
  const closedTickets = filteredTickets.filter((t) => t.status === "resolved");

  const renderSection = (title: string, sectionTickets: Ticket[]) => (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-2 text-sm text-gray-500">
          {sectionTickets.length} ticket{sectionTickets.length !== 1 ? "s" : ""}
        </div>
      </div>

      {sectionTickets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-500">No tickets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sectionTickets.map((ticket) => {
            const isUnaccepted = !ticket.accepted;
            const progress = ticket.status === "in-progress";
            const isResolved = ticket.status === "resolved";
            
            return (
              <div
                key={ticket._id}
                onClick={() => navigate(`/ticket/${ticket.ticketId}`)}
                className={`block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
                  isUnaccepted ? "border-l-4 border-l-orange-400" : ""
                } ${isResolved ? "border-l-4 border-l-blue-400" : ""} ${
                  progress ? "border-l-4 border-l-green-400" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-blue-600">
                        #{ticket.ticketId}
                      </span>
                      {isUnaccepted && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Unclaimed
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-snug">
                      {ticket.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      statusColors[ticket.status]
                    }`}
                  >
                    {ticket.status.replace("-", " ").toUpperCase()}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      priorityColors[ticket.priority]
                    }`}
                  >
                    {ticket.priority.toUpperCase()}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      departmentColors[ticket.department]
                    }`}
                  >
                    {ticket.department.replace("-", " ").toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span className="text-xs">
                      Requester:{" "}
                      <span className="font-medium">{ticket.createdBy.name}</span>
                    </span>
                  </div>

                  {ticket.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-xs">
                        Assigned to:{" "}
                        <span className="font-medium">{ticket.assignedTo.name}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout pageTitle="My Created Tickets">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="My Created Tickets">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Tickets
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchCreatedTickets}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Created Tickets">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            My Created Tickets
          </h1>
          <p className="text-gray-600">Tickets that are created by me</p>
        </div>

        <div className="relative mb-6">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderSection("In-progress Tickets", openTickets)}
          {renderSection("Closed Tickets", closedTickets)}
        </div>
      </div>
    </Layout>
  );
}