// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import { Search } from "lucide-react";
// import TicketCard from "../components/TicketCard";
// import { ticketsApi, type Ticket } from "../lib/api";
// import { AlertCircle } from "lucide-react";
// import useDebounce from "../hooks/debounce";
// import { useSelector } from "react-redux";
// import { selectCurrentUser } from "../redux/user/userSlice";

// export default function TicketsDashboard() {
//   const [tickets, setTickets] = useState<Ticket[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const debouncedSearchTerm = useDebounce(searchTerm, 500);
//   const currentUser = useSelector(selectCurrentUser);

//   useEffect(() => {
//     async function fetchTickets() {
//       try {
//         setLoading(true);
//         const res = await ticketsApi.getAll(debouncedSearchTerm);
//         setTickets(res);
//       } catch (error) {
//         console.error("Error fetching tickets:", error);
//         setTickets([]);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchTickets();
//   }, [debouncedSearchTerm]);

  
//   const departmentTickets = tickets.filter((t) => t.department === currentUser.department);
//   const open = departmentTickets.filter((t) => !t.accepted);
//   const assigned = departmentTickets.filter((t) => t.accepted && t.status !== "resolved");
//   const closedTickets = departmentTickets.filter((t) => t.status === "resolved");

//   const renderSection = (
//     title: string,
//     sectionTickets: Ticket[],
//     description?: string
//   ) => (
//     <div>
//       <div className="mb-4">
//         <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
//         {description && (
//           <p className="text-sm text-gray-600 mt-1">{description}</p>
//         )}
//         <div className="mt-2 text-sm text-gray-500">
//           {sectionTickets.length} ticket{sectionTickets.length !== 1 ? "s" : ""}
//         </div>
//       </div>

//       {sectionTickets.length === 0 ? (
//         <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
//           <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
//           <p className="text-gray-500">No tickets in this category</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 gap-4">
//           {sectionTickets
//             .filter((ticket) => ticket.department === currentUser.department)
//             .map((ticket) => (
//               <TicketCard
//                 key={ticket._id}
//                 _id={ticket._id}
//                 ticketId={ticket.ticketId}
//                 title={ticket.title}
//                 status={ticket.status}
//                 priority={ticket.priority}
//                 department={ticket.department}
//                 createdBy={ticket.createdBy}
//                 assignedTo={ticket.assignedTo}
//                 createdAt={ticket.createdAt}
//                 accepted={ticket.accepted}
//               />
//             ))}
//         </div>
//       )}
//     </div>
//   );

//   if (loading) {
//     return (
//       <Layout pageTitle="Tickets Dashboard">
//         <div className="max-w-7xl mx-auto">
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {[1, 2, 3].map((i) => (
//               <div key={i} className="space-y-4">
//                 <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
//                 <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
//                   <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
//                   <div className="h-4 bg-gray-200 rounded w-full mb-2" />
//                   <div className="h-4 bg-gray-200 rounded w-3/4" />
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </Layout>
//     );
//   }

//   return (
//     <Layout pageTitle="Tickets Dashboard">
//       <div className="max-w-7xl mx-auto">
//         <div className="mb-6">
//           <h1 className="text-2xl font-bold text-gray-900 mb-2">All Tickets</h1>
//           <p className="text-gray-600">
//             View and manage all support tickets across different states
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
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {renderSection(
//             "Open Tickets",
//             open,
//             "Tickets waiting to be accepted"
//           )}
//           {renderSection(
//             "Assigned Tickets",
//             assigned,
//             "Tickets accepted by a team member"
//           )}
//           {renderSection(
//             "Closed Tickets",
//             closedTickets,
//             "Resolved and completed tickets"
//           )}
//         </div>
//       </div>
//     </Layout>
//   );
// }




import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Search, AlertCircle, Grid3x3, List } from "lucide-react";
import TicketCard from "../components/TicketCard";
import { ticketsApi, type Ticket } from "../lib/api";
import useDebounce from "../hooks/debounce";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { Navigate, useNavigate } from "react-router-dom";
// import usePersistentState from "@/hooks/usePersistantState";

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TicketsDashboard() {
  const xx = localStorage.getItem("viewMode");
  const [viewMode, setViewMode] = useState(xx);

  // const [viewMode, setViewMode] = usePersistentState<"grid" | "list">("viewMode", "list");
  const [activeTab, setActiveTab] = useState<"open" | "assigned" | "closed">("open");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const currentUser = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const limit = 100;

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on search change
  }, [debouncedSearchTerm]);

  useEffect(() => {
    console.log("ckicked");
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const endpoint = debouncedSearchTerm
          ? `/ticket?search=${encodeURIComponent(debouncedSearchTerm)}&page=${currentPage}&limit=${limit}`
          : `/ticket?page=${currentPage}&limit=${limit}`;
        const res = await ticketsApi.getAll(endpoint);
        setTickets(res.tickets || res);
        setPagination(res.pagination || { total: res.length, page: currentPage, limit, totalPages: Math.ceil(res.length / limit) });
      } catch (error) {
        console.error("Error fetching tickets:", error);
        setTickets([]);
        setPagination({ total: 0, page: 1, limit, totalPages: 1 });
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, [currentPage, debouncedSearchTerm]);

  // Filter tickets client-side based on department and category
  const departmentTickets = tickets.filter((t) => t.department === currentUser.department);
  const openTickets = departmentTickets.filter((t) => !t.accepted);
  const assignedTickets = departmentTickets.filter((t) => t.accepted && t.status !== "resolved");
  const closedTickets = departmentTickets.filter((t) => t.status === "resolved");

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
            <tbody className="bg-white divide-y divide-gray-200" >
              {paginatedTickets.map((ticket) => (
                <tr
                  key={ticket.ticketId}
                  className={`hover:bg-gray-50 transition-all duration-200 ${
                    !ticket.accepted
                      ? "border-l-4 border-l-orange-400"
                      : ticket.status === "in-progress"
                      ? "border-l-4 border-l-green-400"
                      : ticket.status === "resolved"
                      ? "border-l-4 border-l-blue-400"
                      : ""
                  }`}
                  // onClick={()=>navigate(`/${paginatedTickets.ticketId}`)}
                >
                  <td className="px-5 py-4 whitespace-nowrap">
                    <a href={`/ticket/${ticket.ticketId}`} className="text-blue-600 hover:text-blue-700 font-semibold">
                      {ticket.title}
                    </a>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        ticket.priority === "high"
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
                          : ticket.status === "resolved"
                          ? "bg-blue-100 text-blue-700"
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
      <Layout pageTitle="Tickets Dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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

  return (
    <Layout pageTitle="Tickets Dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">All Tickets</h1>
          <p className="text-gray-600 text-sm">View and manage all support tickets across different states</p>
        </div> */}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderSection(
              "Open Tickets",
              openTickets,
              "Tickets waiting to be accepted"
            )}
            {renderSection(
              "Assigned Tickets",
              assignedTickets,
              "Tickets accepted by a team member"
            )}
            {renderSection(
              "Closed Tickets",
              closedTickets,
              "Resolved and completed tickets"
            )}
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
                onClick={() => setActiveTab("assigned")}
                className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  activeTab === "assigned"
                    ? "bg-blue-100 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Assigned ({assignedTickets.length})
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
            {activeTab === "assigned" && renderTable(assignedTickets)}
            {activeTab === "closed" && renderTable(closedTickets)}
          </div>
        )}
      </div>
    </Layout>
  );
}
