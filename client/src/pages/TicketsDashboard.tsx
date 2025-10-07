import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Search } from "lucide-react";
import TicketCard from "../components/TicketCard";
import { ticketsApi, type Ticket } from "../lib/api";
import { AlertCircle } from "lucide-react";
import useDebounce from "../hooks/debounce";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";

export default function TicketsDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const currentUser = useSelector(selectCurrentUser);
  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const res = await ticketsApi.getAll(debouncedSearchTerm);
        setTickets(res);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [debouncedSearchTerm]);

  const open = tickets.filter((t) => !t.accepted);
  const assigned = tickets.filter((t) => t.accepted && t.status !== "resolved");
  const closedTickets = tickets.filter((t) => t.status === "resolved");

  const renderSection = (
    title: string,
    sectionTickets: Ticket[],
    description?: string
  ) => (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500">
          {sectionTickets.length} ticket{sectionTickets.length !== 1 ? "s" : ""}
        </div>
      </div>

      {sectionTickets.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-500">No tickets in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sectionTickets
            .filter((ticket) => ticket.department === currentUser.department)
            .map((ticket) => (
              <TicketCard
                key={ticket._id}
                _id={ticket._id}
                ticketId={ticket.ticketId}
                title={ticket.title}
                status={ticket.status}
                priority={ticket.priority}
                department={ticket.department}
                createdBy={ticket.createdBy}
                assignedTo={ticket.assignedTo}
                createdAt={ticket.createdAt}
                accepted={ticket.accepted}
              />
            ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout pageTitle="Tickets Dashboard">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
                <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Tickets Dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">All Tickets</h1>
          <p className="text-gray-600">
            View and manage all support tickets across different states
          </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderSection(
            "Open Tickets",
            open,
            "Tickets waiting to be accepted"
          )}
          {renderSection(
            "Assigned Tickets",
            assigned,
            "Tickets accepted by a team member"
          )}
          {renderSection(
            "Closed Tickets",
            closedTickets,
            "Resolved and completed tickets"
          )}
        </div>
      </div>
    </Layout>
  );
}