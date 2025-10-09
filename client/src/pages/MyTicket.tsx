// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import TicketCard from "../components/TicketCard";

// import useDebounce from "../hooks/debounce";
// import { Search } from "lucide-react";
// import { ticketsApi, type Ticket } from "../lib/api";
// import { AlertCircle } from "lucide-react";
// import { useSelector } from "react-redux";
// import { selectCurrentUser } from "../redux/user/userSlice";

// export default function MyTickets() {
//   const [tickets, setTickets] = useState<Ticket[]>([]);
//   const [loading, setLoading] = useState(true);
//   const currentUser = useSelector(selectCurrentUser);
//   const [searchTerm, setSearchTerm] = useState("");
//   const debouncedSearchTerm = useDebounce(searchTerm, 500);
//   useEffect(() => {
//     if (currentUser) {
//       fetchMyTickets();
//     }
//   }, [debouncedSearchTerm]);

//   async function fetchMyTickets() {
//     try {
//       const email = currentUser ? currentUser.email : "test";
//       const data = await ticketsApi.getMyTickets(email,debouncedSearchTerm);
//       setTickets(data);
//     } catch (error) {
//       console.error("Error fetching my tickets:", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   const openTickets = tickets.filter((t) => t.status === "in-progress");
//   const closedTickets = tickets.filter((t) => t.status === "resolved");

//   const renderSection = (title: string, sectionTickets: Ticket[]) => (
//     <div>
//       <div className="mb-4">
//         <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
//         <div className="mt-2 text-sm text-gray-500">
//           {sectionTickets.length} ticket{sectionTickets.length !== 1 ? "s" : ""}
//         </div>
//       </div>

//       {sectionTickets.length === 0 ? (
//         <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
//           <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
//           <p className="text-gray-500">No tickets found</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 gap-4">
//           {sectionTickets.map((ticket) => (
//             <TicketCard
//               key={ticket._id}
//               _id={ticket._id}
//               ticketId={ticket.ticketId}
//               title={ticket.title}
//               status={ticket.status}
//               priority={ticket.priority}
//               department={ticket.department}
//               createdBy={ticket.createdBy}
//               assignedTo={ticket.assignedTo}
//               createdAt={ticket.createdAt}
//               accepted={ticket.accepted}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );

//   if (loading) {
//     return (
//       <Layout pageTitle="My Assigned Tickets">
//         <div className="max-w-7xl mx-auto">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {[1, 2, 3, 4].map((i) => (
//               <div
//                 key={i}
//                 className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
//               >
//                 <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
//                 <div className="h-4 bg-gray-200 rounded w-full mb-2" />
//                 <div className="h-4 bg-gray-200 rounded w-3/4" />
//               </div>
//             ))}
//           </div>
//         </div>
//       </Layout>
//     );
//   }

//   return (
//     <Layout pageTitle="My Assigned Tickets">
//       <div className="max-w-7xl mx-auto">
//         <div className="mb-6">
//           <h1 className="text-2xl font-bold text-gray-900 mb-2">
//             My Assigned Tickets
//           </h1>
//           <p className="text-gray-600">
//             Tickets that are currently assigned to you
//           </p>
//         </div>
//         <div className="relative mb-6">
//           <Search
//             className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
//             size={20}
//           />
//           <input
//             type="text"
//             placeholder="Search by title..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//           {renderSection("In-progress Tickets", openTickets)}
//           {renderSection("Closed by me", closedTickets)}
//         </div>
//       </div>
//     </Layout>
//   );
// }

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
  const xx = localStorage.getItem("viewMode");
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
      const ticketsData = await ticketsApi.getMyTickets(email, debouncedSearchTerm);
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

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in-progress");
  const closedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  const getPaginatedTickets = (ticketList: Ticket[], page: number) => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return ticketList.slice(start, end);
  };

  const renderSection = (title: string, sectionTickets: Ticket[], description?: string) => {
    const paginatedTickets = getPaginatedTickets(sectionTickets, currentPage);
    const totalPages = Math.ceil(sectionTickets.length / limit) || 1;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 transition-all duration-200 hover:shadow-md">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
          <div className="mt-2 text-sm text-gray-500 font-medium">
            {sectionTickets.length} ticket{sectionTickets.length !== 1 ? "s" : ""}
          </div>
        </div>

        {sectionTickets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-gray-500 font-medium">No tickets in this category</p>
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
                className="hover:-translate-y-0.5"
              />
            ))}
          </div>
        )}
        {sectionTickets.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
            >
              Previous
            </button>
            <span className="text-gray-600 font-medium">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
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
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-500 font-medium">No tickets in this category</p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Title</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Requester</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTickets.map((ticket) => (
                <tr
                  key={ticket.ticketId}
                  className={`hover:bg-gray-50 transition-all duration-200 ${
                    !ticket.accepted
                      ? "border-l-4 border-l-orange-400"
                      : ticket.status === "in-progress"
                      ? "border-l-4 border-l-green-400"
                      : ticket.status === "resolved" || ticket.status === "closed"
                      ? "border-l-4 border-l-blue-400"
                      : ""
                  }`}
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <a href={`/ticket/${ticket.ticketId}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                      {ticket.title}
                    </a>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        ticket.priority === "high" || ticket.priority === "urgent"
                          ? "bg-red-100 text-red-700"
                          : ticket.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {ticket.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        !ticket.accepted
                          ? "bg-orange-100 text-orange-700"
                          : ticket.status === "in-progress"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {!ticket.accepted
                        ? "UNCLAIMED"
                        : ticket.status.replace("-", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                    {ticket.createdBy?.name || "Unknown"}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end items-center gap-4">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
          >
            Previous
          </button>
          <span className="text-gray-600 font-medium">Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
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
                <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
                <div className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
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

  if (error) {
    return (
      <Layout pageTitle="My Assigned Tickets">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Tickets</h2>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Assigned Tickets</h1>
          <p className="text-gray-600 text-sm">Tickets that are currently assigned to you</p>
        </div>
        <div className="flex items-center mb-6 space-x-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200 ${
                viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-50"
              }`}
              title="Grid View"
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200 ${
                viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-50"
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
        </div>
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderSection("Open Tickets", openTickets, "Tickets assigned to you that are open or in progress")}
            {renderSection("Closed Tickets", closedTickets, "Tickets assigned to you that have been resolved or closed")}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex mb-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("open")}
                className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  activeTab === "open"
                    ? "bg-blue-100 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Open ({openTickets.length})
              </button>
              <button
                onClick={() => setActiveTab("closed")}
                className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  activeTab === "closed"
                    ? "bg-blue-100 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Closed ({closedTickets.length})
              </button>
            </div>
            {activeTab === "open" && renderTable(openTickets)}
            {activeTab === "closed" && renderTable(closedTickets)}
          </div>
        )}
      </div>
    </Layout>
  );
}