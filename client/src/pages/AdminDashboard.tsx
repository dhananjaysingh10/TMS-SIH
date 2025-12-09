import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { Navigate } from "react-router-dom";
import {
    analyticsApi,
    productApi,
    type DepartmentAnalytics,
    type EmployeesAnalytics,
    type EmployeeStats,
    type ProductsAnalytics
} from "../lib/api";
import {
    BarChart3,
    Clock,
    Filter,
    Package,
    AlertCircle,
    Star,
    ChevronDown,
    Users,
    CheckCircle,
    Loader2,
    AlertTriangle
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

type TimeRange = "1h" | "24h" | "10d" | "1m" | "1y" | "all";

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "1h", label: "Last 1 Hour" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "10d", label: "Last 10 Days" },
    { value: "1m", label: "Last 30 Days" },
    { value: "1y", label: "Last 1 Year" },
    { value: "all", label: "All Time" },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
    const currentUser = useSelector(selectCurrentUser);
    const [selectedRange, setSelectedRange] = useState<TimeRange>("1m");
    const [departmentData, setDepartmentData] = useState<DepartmentAnalytics | null>(null);
    const [employeesData, setEmployeesData] = useState<EmployeesAnalytics | null>(null);
    const [productsData, setProductsData] = useState<ProductsAnalytics | null>(null);
    const [productsList, setProductsList] = useState<{ _id: string; name: string }[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Redirect non-admin users
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        fetchAnalytics();
    }, [selectedRange, selectedProductId]);

    useEffect(() => {
        // Fetch products list for dropdown (super-admin only)
        if (currentUser?.role === 'super-admin') {
            productApi.getAll().then((res) => {
                setProductsList(res.map((p: any) => ({ _id: p._id, name: p.name })));
            }).catch(console.error);
        }
    }, [currentUser]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const [deptRes, empRes, prodRes] = await Promise.all([
                analyticsApi.getDepartment(selectedRange),
                analyticsApi.getEmployees(selectedRange, selectedProductId || undefined),
                analyticsApi.getProducts(selectedRange),
            ]);
            setDepartmentData(deptRes);
            setEmployeesData(empRes);
            setProductsData(prodRes);
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
            setError("Failed to load analytics data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtext }: { title: string; value: string | number; icon: React.ElementType; color: string; subtext?: string }) => (
        <div className={`bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6 hover:shadow-xl transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtext && <p className="text-sm text-gray-400 mt-1">{subtext}</p>}
        </div>
    );

    const EmployeeRow = ({ emp }: { emp: EmployeeStats }) => (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <img
                        src={emp.employee.profilePicture}
                        alt={emp.employee.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div>
                        <p className="font-semibold text-gray-900">{emp.employee.name}</p>
                        <p className="text-sm text-gray-500">{emp.employee.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {emp.currentWorkload}
                </span>
            </td>
            <td className="px-4 py-4 text-center font-semibold text-gray-900">
                {emp.ticketStats.resolved + emp.ticketStats.closed}
            </td>
            <td className="px-4 py-4 text-center text-gray-700">
                {emp.avgResolutionTimeHours > 0 ? `${emp.avgResolutionTimeHours}h` : "-"}
            </td>
            <td className="px-4 py-4 text-center">
                {emp.avgRating !== null ? (
                    <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold">
                        <Star className="w-4 h-4 fill-yellow-500" />
                        {emp.avgRating}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
        </tr>
    );

    if (loading) {
        return (
            <Layout pageTitle="Admin Dashboard">
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout pageTitle="Admin Dashboard">
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-700 font-semibold text-lg">{error}</p>
                        <button
                            onClick={fetchAnalytics}
                            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // Process data for charts
    const statusData = departmentData ? [
        { name: 'Open', value: departmentData.ticketVolume.open, color: '#F59E0B' },
        { name: 'In Progress', value: departmentData.ticketVolume.inProgress, color: '#3B82F6' },
        { name: 'Resolved', value: departmentData.ticketVolume.resolved, color: '#10B981' },
        { name: 'Closed', value: departmentData.ticketVolume.closed, color: '#6B7280' },
    ] : [];

    const priorityData = departmentData ? [
        { name: 'Urgent', value: departmentData.priorityBreakdown.urgent },
        { name: 'High', value: departmentData.priorityBreakdown.high },
        { name: 'Medium', value: departmentData.priorityBreakdown.medium },
        { name: 'Low', value: departmentData.priorityBreakdown.low },
    ] : [];

    const resolutionData = departmentData && departmentData.resolutionDistribution ? [
        { name: '< 4h', value: departmentData.resolutionDistribution.under4h },
        { name: '4-24h', value: departmentData.resolutionDistribution.under24h },
        { name: '1-3d', value: departmentData.resolutionDistribution.under3d },
        { name: '> 3d', value: departmentData.resolutionDistribution.over3d },
    ] : [];

    const productChartData = productsData?.products.map(p => ({
        name: p.product,
        Total: p.total,
        Open: p.open,
        Resolved: p.resolved
    })) || [];

    return (
        <Layout pageTitle="Admin Dashboard">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {departmentData?.department ? `${departmentData.department} Department Analytics` : 'Analytics Overview'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Performance Metrics
                        </p>
                    </div>
                    <div className="relative">
                        <select
                            value={selectedRange}
                            onChange={(e) => setSelectedRange(e.target.value as TimeRange)}
                            className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-5 py-3 pr-10 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-sm"
                        >
                            {timeRangeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Tickets"
                        value={departmentData?.ticketVolume.total || 0}
                        icon={BarChart3}
                        color="bg-gradient-to-br from-blue-500 to-blue-600"
                    />
                    <StatCard
                        title="Resolution Rate"
                        value={`${departmentData?.ticketVolume.total
                            ? Math.round(
                                ((departmentData.ticketVolume.resolved +
                                    departmentData.ticketVolume.closed) /
                                    departmentData.ticketVolume.total) *
                                100
                            )
                            : 0
                            }%`}
                        icon={CheckCircle}
                        color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                        subtext={`${(departmentData?.ticketVolume.resolved || 0) + (departmentData?.ticketVolume.closed || 0)} resolved`}
                    />
                    <StatCard
                        title="Avg Resolution Time"
                        value={departmentData?.avgResolutionTimeHours ? `${departmentData.avgResolutionTimeHours}h` : "-"}
                        icon={Clock}
                        color="bg-gradient-to-br from-purple-500 to-purple-600"
                        subtext="Time to Resolve"
                    />
                    <StatCard
                        title="Avg Acceptance Time"
                        value={departmentData?.avgAcceptanceTimeHours ? `${departmentData.avgAcceptanceTimeHours}h` : "-"}
                        icon={CheckCircle}
                        color="bg-gradient-to-br from-yellow-500 to-orange-500"
                        subtext="Time to Accept"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Ticket Status Distribution</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={statusData[index].color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Product Distribution Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            Tickets by Product
                        </h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        interval={0}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend verticalAlign="top" />
                                    <Bar dataKey="Total" name="Total Tickets" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Resolved" name="Resolved Tickets" fill="#10B981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Priority & SLA Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Priority Bar Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100 col-span-2">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Priority Breakdown</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 13, fontWeight: 500 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Tickets" fill="#6366f1" radius={[0, 4, 4, 0]}>
                                        {priorityData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Resolution Time Distribution */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100 flex flex-col justify-center">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 self-start">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Resolution Time Distribution
                        </h2>
                        {departmentData ? (
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={resolutionData} margin={{ bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" name="Tickets" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                            {resolutionData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-10">No data available</div>
                        )}
                    </div>
                </div>

                {/* Employee Table */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Team Performance
                        </h2>
                        {currentUser?.role === 'super-admin' && (
                            <div className="relative">
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Products</option>
                                    {productsList.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name === "Default Product" ? "Legacy" : p.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        )}
                    </div>
                    {employeesData?.employees && employeesData.employees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Workload</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Resolved</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Time</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {employeesData.employees.map((emp) => (
                                        <EmployeeRow key={emp.employee._id} emp={emp} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            No team performance data available
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
