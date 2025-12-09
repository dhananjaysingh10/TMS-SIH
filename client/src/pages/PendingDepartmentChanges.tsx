import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ticketsApi, productApi } from "../lib/api";
import type { Ticket, Department } from "../lib/api";
import { AlertTriangle, CheckCircle, ChevronDown, Loader2 } from "lucide-react";

interface ProductWithDepartments {
    product: {
        _id: string;
        name: string;
    };
    departments: Department[];
}

const PendingDepartmentChanges: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useSelector((state: { user: { currentUser: { role?: string; _id?: string } | null } }) => state.user);

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<ProductWithDepartments[]>([]);

    // Track selected department for each ticket
    const [selectedDepartments, setSelectedDepartments] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [ticketsData, productsData] = await Promise.all([
                    ticketsApi.getTicketsInReview(),
                    productApi.getAll(),
                ]);

                setTickets(ticketsData);

                // Fetch departments for each product
                const productsWithDepts: ProductWithDepartments[] = await Promise.all(
                    productsData.map(async (p) => {
                        const productDetails = await productApi.getById(p._id);
                        return productDetails;
                    })
                );
                setProducts(productsWithDepts);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load pending tickets");
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.role === "admin" || currentUser?.role === "super-admin") {
            fetchData();
        } else {
            setError("Access denied. Admin only.");
            setLoading(false);
        }
    }, [currentUser]);

    const handleDepartmentChange = (ticketId: string, departmentId: string) => {
        setSelectedDepartments((prev) => ({ ...prev, [ticketId]: departmentId }));
    };

    const handleApprove = async (ticketId: string) => {
        const departmentId = selectedDepartments[ticketId];
        if (!departmentId) {
            alert("Please select a department first");
            return;
        }

        try {
            setProcessing((prev) => ({ ...prev, [ticketId]: true }));
            await ticketsApi.approveDepartmentChange(ticketId, departmentId);

            // Remove from list
            setTickets((prev) => prev.filter((t) => t.ticketId !== ticketId));
        } catch (err) {
            console.error("Error approving department change:", err);
            alert("Failed to approve department change");
        } finally {
            setProcessing((prev) => ({ ...prev, [ticketId]: false }));
        }
    };

    if (loading) {
        return (
            <Layout pageTitle="Pending Department Changes">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout pageTitle="Pending Department Changes">
                <div className="text-center text-red-500 py-8">{error}</div>
            </Layout>
        );
    }

    return (
        <Layout pageTitle="Pending Department Changes">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="text-yellow-500" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Tickets Pending Department Review
                    </h1>
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                        {tickets.length} pending
                    </span>
                </div>

                {tickets.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                        <p className="text-gray-600 dark:text-gray-300 text-lg">
                            No tickets pending department changes
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket._id}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3
                                            className="text-lg font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                                            onClick={() => navigate(`/ticket/${ticket.ticketId}`)}
                                        >
                                            {ticket.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            ID: {ticket.ticketId}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${(ticket.priority as string) === "urgent"
                                            ? "bg-red-100 text-red-800"
                                            : (ticket.priority as string) === "high"
                                                ? "bg-orange-100 text-orange-800"
                                                : ticket.priority === "medium"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-green-100 text-green-800"
                                            }`}
                                    >
                                        {ticket.priority}
                                    </span>
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                                    {ticket.description}
                                </p>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Created by: </span>
                                        <span className="text-gray-700 dark:text-gray-200">
                                            {typeof ticket.createdBy === 'object' ? ticket.createdBy.name : ticket.createdBy}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Current Team: </span>
                                        <span className="text-gray-700 dark:text-gray-200">
                                            {typeof ticket.departmentRef === 'object' ? ticket.departmentRef.name : ticket.department || "None"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex-1">
                                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                                            Assign to new team within same product:
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedDepartments[ticket.ticketId] || ""}
                                                onChange={(e) => handleDepartmentChange(ticket.ticketId, e.target.value)}
                                                className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">Select a team...</option>
                                                {/* Only show departments from the ticket's current product */}
                                                {(() => {
                                                    // Get the product ID from the ticket's department
                                                    const ticketProductId = typeof ticket.departmentRef === 'object'
                                                        ? (ticket.departmentRef as any).product
                                                        : null;
                                                    // Find the matching product and show only its departments
                                                    const matchingProduct = products.find(p => p.product._id === ticketProductId);
                                                    if (matchingProduct) {
                                                        return matchingProduct.departments.map((dept) => (
                                                            <option key={dept._id} value={dept._id}>
                                                                {dept.name}
                                                            </option>
                                                        ));
                                                    }
                                                    return <option disabled>No departments found</option>;
                                                })()}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleApprove(ticket.ticketId)}
                                        disabled={!selectedDepartments[ticket.ticketId] || processing[ticket.ticketId]}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    >
                                        {processing[ticket.ticketId] ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <CheckCircle size={18} />
                                        )}
                                        Approve & Assign
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PendingDepartmentChanges;
