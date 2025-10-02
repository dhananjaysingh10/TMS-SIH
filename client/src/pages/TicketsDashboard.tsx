import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import TicketCard from "../components/TicketCard";
import { ticketsApi, type Ticket } from "../lib/api";
import { AlertCircle } from "lucide-react";

export default function TicketsDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const data = await ticketsApi.getAll();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  const assignedAndAccepted = tickets.filter(
    (t) => t.assigned_to && t.accepted && t.status !== "closed"
  );

  const assignedNotAccepted = tickets.filter(
    (t) => t.assigned_to && !t.accepted && t.status !== "closed"
  );

  const closedTickets = tickets.filter((t) => t.status === "closed");

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderSection(
            "Assigned & Accepted",
            assignedAndAccepted,
            "Tickets claimed by team members"
          )}
          {renderSection(
            "Assigned & Unclaimed",
            assignedNotAccepted,
            "Available tickets waiting to be claimed"
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
