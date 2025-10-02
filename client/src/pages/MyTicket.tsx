import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import TicketCard from "../components/TicketCard";
import { ticketsApi, type Ticket } from "../lib/api";
import { AlertCircle } from "lucide-react";

export default function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = "current-user-id";

  useEffect(() => {
    fetchMyTickets();
  }, []);

  async function fetchMyTickets() {
    try {
      const data = await ticketsApi.getMyTickets(currentUserId);
      setTickets(data);
    } catch (error) {
      console.error("Error fetching my tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  const openTickets = tickets.filter((t) => t.status !== "closed");
  const closedTickets = tickets.filter((t) => t.status === "closed");

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              id={ticket.id}
              ticketNumber={ticket.ticket_number}
              subject={ticket.subject}
              status={ticket.status}
              priority={ticket.priority}
              category={ticket.category}
              requester={{
                name: ticket.requester.full_name,
                email: ticket.requester.email,
              }}
              assignedTo={
                ticket.assigned_to
                  ? { name: ticket.assigned_to.full_name }
                  : undefined
              }
              createdAt={ticket.created_at}
              accepted={ticket.accepted}
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
            My Assigned Tickets
          </h1>
          <p className="text-gray-600">
            Tickets that are currently assigned to you
          </p>
        </div>

        <div className="space-y-8">
          {renderSection("My Open Tickets", openTickets)}
          {renderSection("My Closed Tickets", closedTickets)}
        </div>
      </div>
    </Layout>
  );
}
