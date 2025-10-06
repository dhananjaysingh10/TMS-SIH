//createdbyme.tsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { ticketsApi, type Ticket } from "../lib/api";
import { AlertCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import TicketCard from "@/components/TicketCard";

import useDebounce from "../hooks/debounce";
import { Search } from "lucide-react";
export default function CreatedByMe() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector(selectCurrentUser);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  useEffect(() => {
    if (currentUser) {
      fetchMyTickets();
    }
  }, [debouncedSearchTerm]);

  async function fetchMyTickets() {
    try {
      const email = currentUser ? currentUser.email : "test";
      const data = await ticketsApi.createdByMe(email, debouncedSearchTerm);
      console.log(data);
      setTickets(data);
    } catch (error) {
      console.error("Error fetching my tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  const openTickets = tickets.filter(
    (t) => t.status === "in-progress" || t.status === "open"
  );
  const closedTickets = tickets.filter((t) => t.status === "resolved");

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
          {sectionTickets.map((ticket) => (
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
              userTicket={true}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout pageTitle="My Assigned Tickets">
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

  return (
    <Layout pageTitle="My Assigned Tickets">
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
