import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import TicketCard from "../components/TicketCard";
import useDebounce from "../hooks/debounce";
import { Search, AlertCircle, Grid3x3, List } from "lucide-react";
import { ticketsApi, type Ticket } from "../lib/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MyTickets() {
  const xx = localStorage.getItem("viewMode") || "grid";
  const [viewMode, setViewMode] = useState(xx);
  const currentUser = useSelector(selectCurrentUser);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on search change
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (currentUser?.email) {
      fetchMyTickets();
    } else {
      setError("User email not found");
      setLoading(false);
      setTickets([]);
    }
  }, [currentUser, debouncedSearchTerm, currentPage]);

  useEffect(() => {
    // console.log("ckicked");
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  async function fetchMyTickets() {
    try {
      setLoading(true);
      const email = currentUser?.email || "test";
      const ticketsData = await ticketsApi.getMyTickets(
        email,
        debouncedSearchTerm
      );
      console.log("Processed tickets data:", ticketsData); // Debug log
      setTickets(ticketsData);
      setError(null);
    } catch (error) {
      console.error("Error fetching my tickets:", error);
      setError("Failed to load your assigned tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in-progress"
  );
  const closedTickets = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  );

  const getPaginatedTickets = (ticketList: Ticket[], page: number) => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return ticketList.slice(start, end);
  };

  const renderSection = (
    title: string,
    sectionTickets: Ticket[],
    description?: string
  ) => {
    const paginatedTickets = getPaginatedTickets(sectionTickets, currentPage);
    const totalPages = Math.ceil(sectionTickets.length / limit) || 1;

    const sectionColors = {
      "Open Tickets": {
        bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
        border: "border-emerald-200",
        accent: "text-emerald-700",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-700",
      },
      "Closed Tickets": {
        bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
        border: "border-blue-200",
        accent: "text-blue-700",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-700",
      },
    };

    const colors = sectionColors[title as keyof typeof sectionColors] || {
      bg: "bg-gradient-to-br from-gray-50 to-slate-50",
      border: "border-gray-200",
      accent: "text-gray-700",
      badgeBg: "bg-gray-100",
      badgeText: "text-gray-700",
    };

    return (
      <div
        className={`${colors.bg} rounded-xl shadow-lg border-2 ${colors.border} p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
      >
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className={`text-xl font-bold ${colors.accent}`}>{title}</h2>
            <span
              className={`${colors.badgeBg} ${colors.badgeText} px-3 py-1 rounded-full text-sm font-bold`}
            >
              {sectionTickets.length}
            </span>
          </div>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>

        {sectionTickets.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-gray-300 p-10 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="text-gray-500 font-semibold text-lg">
              No tickets in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {paginatedTickets.map((ticket) => (
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
                // className="hover:-translate-y-0.5"
              />
            ))}
          </div>
        )}
        {sectionTickets.length > 0 && (
          <div className="mt-6 flex justify-between items-center bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Previous
            </button>
            <span className="text-gray-700 font-bold text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTable = (tickets: Ticket[]) => {
    const paginatedTickets = getPaginatedTickets(tickets, currentPage);
    const totalPages = Math.ceil(tickets.length / limit) || 1;

    if (tickets.length === 0) {
      return (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-500 font-semibold text-lg">
            No tickets in this category
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-hidden bg-white rounded-xl border-2 border-gray-200 shadow-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Requester
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedTickets.map((ticket) => (
                <tr
                  key={ticket.ticketId}
                  className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all duration-200 ${
                    !ticket.accepted
                      ? "border-l-4 border-l-amber-400 bg-amber-50/30"
                      : ticket.status === "in-progress"
                      ? "border-l-4 border-l-emerald-400 bg-emerald-50/30"
                      : ticket.status === "resolved" ||
                        ticket.status === "closed"
                      ? "border-l-4 border-l-blue-400 bg-blue-50/30"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`/ticket/${ticket.ticketId}`}
                      className="text-blue-600 hover:text-blue-800 font-bold hover:underline transition-colors duration-200"
                    >
                      {ticket.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${
                        ticket.priority === "high"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : ticket.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          : "bg-green-100 text-green-700 border border-green-200"
                      }`}
                    >
                      {ticket.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${
                        !ticket.accepted
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : ticket.status === "in-progress"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {!ticket.accepted
                        ? "UNCLAIMED"
                        : ticket.status.replace("-", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm font-medium">
                    {ticket.createdBy?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm font-medium">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex justify-end items-center gap-4 bg-white rounded-lg p-4 border-2 border-gray-200 shadow-sm">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            Previous
          </button>
          <span className="text-gray-700 font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            Next
          </button>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <Layout pageTitle="My Assigned Tickets">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-48 animate-pulse" />
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg animate-pulse">
                  <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 mb-4" />
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full mb-3" />
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="My Assigned Tickets">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Tickets
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchMyTickets();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Assigned Tickets">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          {/* <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Assigned Tickets
          </h1>
          <p className="text-gray-600 text-base">
            View and manage tickets currently assigned to you
          </p> */}
        </div>
        <div className="flex items-center mb-6 space-x-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 bg-white border-2 border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex space-x-3 bg-white border-2 border-gray-300 rounded-xl p-1.5 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-3 rounded-lg transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Grid View"
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-3 rounded-lg transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
        </div>
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderSection(
              "Open Tickets",
              openTickets,
              "Tickets assigned to you that are open or in progress"
            )}
            {renderSection(
              "Closed Tickets",
              closedTickets,
              "Tickets assigned to you that have been resolved or closed"
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex mb-6 border-b-2 border-gray-200 bg-gray-50 rounded-t-lg -mt-6 -mx-6 px-6">
              <button
                onClick={() => setActiveTab("open")}
                className={`px-6 py-4 text-sm font-bold transition-all duration-200 relative ${
                  activeTab === "open"
                    ? "text-emerald-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Open ({openTickets.length})
                {activeTab === "open" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("closed")}
                className={`px-6 py-4 text-sm font-bold transition-all duration-200 relative ${
                  activeTab === "closed"
                    ? "text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Closed ({closedTickets.length})
                {activeTab === "closed" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t"></div>
                )}
              </button>
            </div>
            <div className="pt-2">
              {activeTab === "open" && renderTable(openTickets)}
              {activeTab === "closed" && renderTable(closedTickets)}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
