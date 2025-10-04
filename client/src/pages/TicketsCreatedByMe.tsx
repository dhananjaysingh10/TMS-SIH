import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { ticketsApi, type Ticket } from "../lib/api";
import {
  Calendar,
  Tag,
  User,
  AlertCircle,
  Clock,
  CheckCircle,
} from "lucide-react";

const priorityColors = {
  low: "bg-gray-100 text-gray-700 border-gray-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  urgent: "bg-red-100 text-red-700 border-red-300",
};

const statusConfig = {
  open: {
    color: "bg-green-100 text-green-700 border-green-300",
    icon: AlertCircle,
  },
  "in-progress": {
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: Clock,
  },
  resolved: {
    color: "bg-purple-100 text-purple-700 border-purple-300",
    icon: CheckCircle,
  },
  closed: {
    color: "bg-gray-100 text-gray-600 border-gray-300",
    icon: CheckCircle,
  },
};

export default function TicketsCreatedByMe() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <Layout pageTitle="Tickets Created by Me">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Tickets Created by Me">
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
    <Layout pageTitle="Tickets Created by Me">
      <div className="max-w-7xl mx-auto">
        {/* Debug info - remove this later */}
        {/* <div className="bg-yellow-100 p-4 mb-4 rounded">
          <h3>Debug Info:</h3>
          <p>Current User: {JSON.stringify(currentUser, null, 2)}</p>
          <p>Loading: {loading.toString()}</p>
          <p>Error: {error}</p>
          <p>Tickets Count: {tickets.length}</p>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tickets Created by Me
          </h1>
          <p className="text-gray-600">
            You have created {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div> */}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Tickets Yet
            </h2>
            <p className="text-gray-600 mb-6">
              You haven't created any tickets yet.
            </p>
            <button
              onClick={() => navigate("/tickets")}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View All Tickets
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const StatusIcon = statusConfig[ticket.status].icon;
              return (
                <div
                  key={ticket._id}
                  onClick={() => navigate(`/ticket/${ticket._id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-blue-600">
                          #{ticket.ticketId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium border ${
                            statusConfig[ticket.status].color
                          }`}
                        >
                          <StatusIcon size={14} />
                          {ticket.status.replace("-", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium border ${
                            priorityColors[ticket.priority]
                          }`}
                        >
                          {ticket.priority.toUpperCase()}
                        </span>
                          <span className="text-xs px-3 py-1 rounded-full font-medium border bg-indigo-100 text-indigo-700 border-indigo-300">
                           {ticket.department}
                          </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {ticket.subject}
                      </h3>
                      <p className="text-gray-600 line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      <span className="capitalize">{ticket.type}</span>
                    </div>

                    {ticket.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span>Assigned to: {ticket.assignedTo.name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>Created {formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

