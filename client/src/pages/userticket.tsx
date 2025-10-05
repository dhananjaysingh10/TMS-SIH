import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ticketsApi, type Ticket } from "../lib/api";
import {
  ArrowLeft,
  User,
  Clock,
  Tag,
  AlertCircle,
} from "lucide-react";

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

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (id) {
      fetchTicketDetails();
    }
  }, [id]);

  async function fetchTicketDetails() {
    try {
      if (!id) return;
      const data = await ticketsApi.getById(id);
      setTicket(data);
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  }
  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <Layout pageTitle="Loading...">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout pageTitle="Ticket Not Found">
        <div className="max-w-5xl mx-auto text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ticket Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The ticket you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/tickets")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Tickets
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={`Ticket ${ticket.ticketId}`}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-blue-600">
                  #{ticket.ticketId}
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded-full font-medium ${
                    statusColors[ticket.status]
                  }`}
                >
                  {ticket.status.replace("_", " ").toUpperCase()}
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded-full font-medium ${
                    priorityColors[ticket.priority]
                  }`}
                >
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {ticket.subject}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <User className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-600">Requester</p>
                <p className="font-medium text-gray-900">
                  {ticket.createdBy.name}
                </p>
                <p className="text-sm text-gray-500">
                  {ticket.createdBy.email}
                </p>
              </div>
            </div>

            {ticket.assignedTo && (
              <div className="flex items-start gap-3">
                <User className="text-gray-400 mt-1" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-medium text-gray-900">
                    {ticket.assignedTo.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ticket.assignedTo.email}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Tag className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium text-gray-900 capitalize">
                  {ticket.type}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(ticket.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
