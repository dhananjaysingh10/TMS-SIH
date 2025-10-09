// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Layout from "../components/Layout";
// import { useSelector } from "react-redux";
// import { selectCurrentUser } from "../redux/user/userSlice";
// import { ticketsApi, type Ticket } from "../lib/api";
// import {
//   AlertCircle,
//   Clock,
//   User,
//   Search,
// } from "lucide-react";
// import useDebounce from "../hooks/debounce";

// const priorityColors = {
//   low: "bg-gray-100 text-gray-700",
//   medium: "bg-blue-100 text-blue-700",
//   high: "bg-orange-100 text-orange-700",
//   urgent: "bg-red-100 text-red-700",
// };

// const statusColors = {
//   open: "bg-green-100 text-green-700",
//   "in-progress": "bg-blue-100 text-blue-700",
//   resolved: "bg-purple-100 text-purple-700",
//   closed: "bg-gray-100 text-gray-600",
// };

// const departmentColors = {
//   IT: "bg-cyan-100 text-cyan-700",
//   DevOps: "bg-indigo-100 text-indigo-700",
//   Software: "bg-purple-100 text-purple-700",
//   Networking: "bg-amber-100 text-amber-700",
//   Cybersecurity: "bg-red-100 text-red-700",
//   Other: "bg-slate-100 text-slate-700",
// };

// function formatDate(dateString: string): string {
//   const date = new Date(dateString);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffMins = Math.floor(diffMs / 60000);
//   const diffHours = Math.floor(diffMs / 3600000);
//   const diffDays = Math.floor(diffMs / 86400000);

//   if (diffMins < 1) {
//     return "just now";
//   } else if (diffMins < 60) {
//     return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
//   } else if (diffHours < 24) {
//     return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
//   } else if (diffDays < 7) {
//     return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
//   } else {
//     return date.toLocaleDateString("en-US", {
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     });
//   }
// }

// export default function TicketsCreatedByMe() {
//   const navigate = useNavigate();
//   const currentUser = useSelector(selectCurrentUser);
//   const [tickets, setTickets] = useState<Ticket[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const debouncedSearchTerm = useDebounce(searchTerm, 500);

//   useEffect(() => {
//     console.log("TicketsCreatedByMe useEffect - currentUser:", currentUser);
//     if (currentUser?.id) {
//       fetchCreatedTickets();
//     } else {
//       console.log("No currentUser.id found, setting loading to false");
//       setLoading(false);
//     }
//   }, [currentUser]);

//   async function fetchCreatedTickets() {
//     if (!currentUser?.id) {
//       setError("User ID not found");
//       setLoading(false);
//       return;
//     }

//     try {
//       console.log("Fetching tickets for user ID:", currentUser.id);
//       const data = await ticketsApi.getCreatedBy(currentUser.id);
//       console.log("Received tickets data:", data);
//       setTickets(data);
//       setError(null);
//     } catch (err) {
//       console.error("Error fetching created tickets:", err);
//       setError("Failed to load your tickets");
//     } finally {
//       setLoading(false);
//     }
//   }

//   const filteredTickets = debouncedSearchTerm
//     ? tickets.filter((ticket) =>
//         ticket.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
//         ticket.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
//         ticket.ticketId?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
//       )
//     : tickets;

//   const openTickets = filteredTickets.filter(
//     (t) => t.status === "in-progress" || t.status === "open"
//   );
//   const closedTickets = filteredTickets.filter((t) => t.status === "resolved");

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
//           {sectionTickets.map((ticket) => {
//             const isUnaccepted = !ticket.accepted;
//             const progress = ticket.status === "in-progress";
//             const isResolved = ticket.status === "resolved";
            
//             return (
//               <div
//                 key={ticket._id}
//                 onClick={() => navigate(`/ticket/${ticket.ticketId}`)}
//                 className={`block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
//                   isUnaccepted ? "border-l-4 border-l-orange-400" : ""
//                 } ${isResolved ? "border-l-4 border-l-blue-400" : ""} ${
//                   progress ? "border-l-4 border-l-green-400" : ""
//                 }`}
//               >
//                 <div className="flex items-start justify-between mb-3">
//                   <div className="flex-1">
//                     <div className="flex items-center gap-2 mb-1">
//                       <span className="text-sm font-bold text-blue-600">
//                         #{ticket.ticketId}
//                       </span>
//                       {isUnaccepted && (
//                         <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
//                           Unclaimed
//                         </span>
//                       )}
//                     </div>
//                     <h3 className="font-semibold text-gray-900 leading-snug">
//                       {ticket.title}
//                     </h3>
//                   </div>
//                 </div>

//                 <div className="flex flex-wrap gap-2 mb-4">
//                   <span
//                     className={`text-xs px-2.5 py-1 rounded-full font-medium ${
//                       statusColors[ticket.status]
//                     }`}
//                   >
//                     {ticket.status.replace("-", " ").toUpperCase()}
//                   </span>
//                   <span
//                     className={`text-xs px-2.5 py-1 rounded-full font-medium ${
//                       priorityColors[ticket.priority]
//                     }`}
//                   >
//                     {ticket.priority.toUpperCase()}
//                   </span>
//                   <span
//                     className={`text-xs px-2.5 py-1 rounded-full font-medium ${
//                       departmentColors[ticket.department]
//                     }`}
//                   >
//                     {ticket.department.replace("-", " ").toUpperCase()}
//                   </span>
//                 </div>

//                 <div className="space-y-2 text-sm text-gray-600">
//                   <div className="flex items-center gap-2">
//                     <User size={14} className="text-gray-400" />
//                     <span className="text-xs">
//                       Requester:{" "}
//                       <span className="font-medium">{ticket.createdBy.name}</span>
//                     </span>
//                   </div>

//                   {ticket.assignedTo && (
//                     <div className="flex items-center gap-2">
//                       <User size={14} className="text-gray-400" />
//                       <span className="text-xs">
//                         Assigned to:{" "}
//                         <span className="font-medium">{ticket.assignedTo.name}</span>
//                       </span>
//                     </div>
//                   )}

//                   <div className="flex items-center gap-2">
//                     <Clock size={14} className="text-gray-400" />
//                     <span className="text-xs text-gray-500">
//                       {formatDate(ticket.createdAt)}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );

//   if (loading) {
//     return (
//       <Layout pageTitle="My Created Tickets">
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

//   if (error) {
//     return (
//       <Layout pageTitle="My Created Tickets">
//         <div className="max-w-7xl mx-auto text-center py-12">
//           <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
//           <h2 className="text-2xl font-bold text-gray-900 mb-2">
//             Error Loading Tickets
//           </h2>
//           <p className="text-gray-600 mb-6">{error}</p>
//           <button
//             onClick={fetchCreatedTickets}
//             className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
//           >
//             Try Again
//           </button>
//         </div>
//       </Layout>
//     );
//   }

//   return (
//     <Layout pageTitle="My Created Tickets">
//       <div className="max-w-7xl mx-auto">
//         <div className="mb-6">
//           <h1 className="text-2xl font-bold text-gray-900 mb-2">
//             My Created Tickets
//           </h1>
//           <p className="text-gray-600">Tickets that are created by me</p>
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
//           {renderSection("Closed Tickets", closedTickets)}
//         </div>
//       </div>
//     </Layout>
//   );
// }
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { ticketsApi, type Ticket } from "../lib/api";
import { AlertCircle, Search, Grid3x3, List } from "lucide-react";
import useDebounce from "../hooks/debounce";
import TicketCard from "../components/TicketCard";

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TicketsCreatedByMe() {
  const navigate = useNavigate();
  const xx = localStorage.getItem("viewMode");
  const [viewMode, setViewMode] = useState(xx);
  const currentUser = useSelector(selectCurrentUser);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  // const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on search change
  }, [debouncedSearchTerm]);

  useEffect(() => {
    console.log("ckicked");
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  const fetchCreatedTickets = async () => {
    if (!currentUser?.id) {
      setError("User ID not found");
      setLoading(false);
      setTickets([]);
      return;
    }

    try {
      setLoading(true);
      const endpoint = debouncedSearchTerm
        ? `/ticket/createdBy/${currentUser.id}?search=${encodeURIComponent(debouncedSearchTerm)}&page=${currentPage}&limit=${limit}`
        : `/ticket/createdBy/${currentUser.id}?page=${currentPage}&limit=${limit}`;
      const res = await ticketsApi.getAll(endpoint);
      // Handle different API response formats
      const ticketsData = Array.isArray(res)
        ? res
        : res.data
        ? res.data
        : res.tickets || [];
      console.log("Processed tickets data:", ticketsData); // Debug log
      setTickets(ticketsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching created tickets:", err);
      setError("Failed to load your tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatedTickets();
  }, [currentUser, currentPage, debouncedSearchTerm]);

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
      <Layout pageTitle="My Created Tickets">
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
      <Layout pageTitle="My Created Tickets">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Tickets</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchCreatedTickets();
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
    <Layout pageTitle="My Created Tickets">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Created Tickets</h1>
          <p className="text-gray-600 text-sm">View and manage tickets you have created</p>
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
            {renderSection("Open Tickets", openTickets, "Tickets you created that are open or in progress")}
            {renderSection("Closed Tickets", closedTickets, "Tickets you created that have been resolved or closed")}
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