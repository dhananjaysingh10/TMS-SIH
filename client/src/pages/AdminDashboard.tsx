import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { Navigate } from "react-router-dom";
import {
    analyticsApi,
    type DepartmentAnalytics,
    type EmployeesAnalytics,
    type EmployeeStats,
} from "../lib/api";
import {
    BarChart3,
    Clock,
    Star,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Loader2,
    ChevronDown,
} from "lucide-react";

type TimeRange = "1h" | "24h" | "10d" | "1m" | "1y" | "all";

const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "1h", label: "Last 1 Hour" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "10d", label: "Last 10 Days" },
    { value: "1m", label: "Last 30 Days" },
    { value: "1y", label: "Last 1 Year" },
    { value: "all", label: "All Time" },
];

export default function AdminDashboard() {
    const currentUser = useSelector(selectCurrentUser);
    const [selectedRange, setSelectedRange] = useState<TimeRange>("1m");
    const [departmentData, setDepartmentData] =
        useState<DepartmentAnalytics | null>(null);
    const [employeesData, setEmployeesData] =
        useState<EmployeesAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Redirect non-admin users
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        fetchAnalytics();
    }, [selectedRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const [deptRes, empRes] = await Promise.all([
                analyticsApi.getDepartment(selectedRange),
                analyticsApi.getEmployees(selectedRange),
            ]);
            setDepartmentData(deptRes);
            setEmployeesData(empRes);
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
            setError("Failed to load analytics data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({
        title,
        value,
        icon: Icon,
        color,
        subtext,
    }: {
        title: string;
        value: string | number;
        icon: React.ElementType;
        color: string;
        subtext?: string;
    }) => (
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

    const StatusBar = ({
        data,
    }: {
        data: { open: number; inProgress: number; resolved: number; closed: number; total: number };
    }) => {
        if (data.total === 0) return <div className="text-gray-400 text-sm">No data</div>;
        const getWidth = (count: number) => `${(count / data.total) * 100}%`;

        return (
            <div className="space-y-3">
                <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                    <div
                        className="bg-amber-500 transition-all"
                        style={{ width: getWidth(data.open) }}
                        title={`Open: ${data.open}`}
                    />
                    <div
                        className="bg-blue-500 transition-all"
                        style={{ width: getWidth(data.inProgress) }}
                        title={`In Progress: ${data.inProgress}`}
                    />
                    <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: getWidth(data.resolved) }}
                        title={`Resolved: ${data.resolved}`}
                    />
                    <div
                        className="bg-gray-500 transition-all"
                        style={{ width: getWidth(data.closed) }}
                        title={`Closed: ${data.closed}`}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-amber-500" /> Open: {data.open}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-blue-500" /> In Progress: {data.inProgress}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" /> Resolved: {data.resolved}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-gray-500" /> Closed: {data.closed}
                    </span>
                </div>
            </div>
        );
    };

    const PriorityChart = ({
        data,
    }: {
        data: { urgent: number; high: number; medium: number; low: number };
    }) => {
        const total = data.urgent + data.high + data.medium + data.low;
        if (total === 0) return <div className="text-gray-400 text-sm">No data</div>;

        const priorities = [
            { label: "Urgent", count: data.urgent, color: "bg-red-500" },
            { label: "High", count: data.high, color: "bg-orange-500" },
            { label: "Medium", count: data.medium, color: "bg-yellow-500" },
            { label: "Low", count: data.low, color: "bg-green-500" },
        ];

        return (
            <div className="space-y-3">
                {priorities.map((p) => (
                    <div key={p.label} className="flex items-center gap-3">
                        <span className="w-16 text-sm text-gray-600">{p.label}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${p.color} transition-all flex items-center justify-end pr-2`}
                                style={{ width: `${(p.count / total) * 100}%` }}
                            >
                                {p.count > 0 && (
                                    <span className="text-xs text-white font-semibold">{p.count}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

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
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
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
                <div className="flex items-center justify-center h-96">
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

    return (
        <Layout pageTitle="Admin Dashboard">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {departmentData?.department} Department Analytics
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Overview of team performance and ticket metrics
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

                {/* Main Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                        subtext={`${(departmentData?.ticketVolume.resolved || 0) +
                            (departmentData?.ticketVolume.closed || 0)
                            } resolved`}
                    />
                    <StatCard
                        title="Avg Resolution Time"
                        value={
                            departmentData?.avgResolutionTimeHours
                                ? `${departmentData.avgResolutionTimeHours}h`
                                : "-"
                        }
                        icon={Clock}
                        color="bg-gradient-to-br from-purple-500 to-purple-600"
                    />
                    <StatCard
                        title="Customer Satisfaction"
                        value={
                            departmentData?.customerSatisfaction.avgRating !== null
                                ? `${departmentData.customerSatisfaction.avgRating}/5`
                                : "-"
                        }
                        icon={Star}
                        color="bg-gradient-to-br from-yellow-500 to-orange-500"
                        subtext={`${departmentData?.customerSatisfaction.totalRated || 0} reviews`}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Status Distribution */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Ticket Status Distribution
                        </h2>
                        {departmentData && <StatusBar data={departmentData.ticketVolume} />}
                    </div>

                    {/* Priority Distribution */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Priority Breakdown
                        </h2>
                        {departmentData && (
                            <PriorityChart data={departmentData.priorityBreakdown} />
                        )}
                    </div>
                </div>

                {/* SLA & Type */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* SLA Compliance */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            SLA Compliance
                        </h2>
                        {departmentData?.slaCompliance.percent !== null ? (
                            <div className="flex items-center gap-6">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="#e5e7eb"
                                            strokeWidth="12"
                                            fill="none"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke={
                                                departmentData.slaCompliance.percent >= 80
                                                    ? "#10b981"
                                                    : departmentData.slaCompliance.percent >= 50
                                                        ? "#f59e0b"
                                                        : "#ef4444"
                                            }
                                            strokeWidth="12"
                                            fill="none"
                                            strokeDasharray={`${(departmentData.slaCompliance.percent / 100) * 352} 352`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">
                                        {departmentData.slaCompliance.percent}%
                                    </span>
                                </div>
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-semibold text-gray-900">
                                            {departmentData.slaCompliance.metCount}
                                        </span>{" "}
                                        of {departmentData.slaCompliance.total} tickets met SLA
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400">No SLA data available</p>
                        )}
                    </div>

                    {/* Ticket Types */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Ticket Types
                        </h2>
                        {departmentData?.typeBreakdown &&
                            Object.keys(departmentData.typeBreakdown).length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(departmentData.typeBreakdown).map(
                                    ([type, count]) => (
                                        <div
                                            key={type}
                                            className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                                        >
                                            <span className="capitalize text-gray-700 font-medium">
                                                {type}
                                            </span>
                                            <span className="text-gray-900 font-bold">{count}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-400">No type data available</p>
                        )}
                    </div>
                </div>

                {/* Employee Performance */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Employee Performance
                        </h2>
                    </div>
                    {employeesData?.employees && employeesData.employees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Employee
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Workload
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Resolved
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Avg Time
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Rating
                                        </th>
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
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">
                                No employee data available
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
