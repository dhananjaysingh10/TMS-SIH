"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Activity, AlertCircle, CheckCircle, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import CreateTicketModal from "../components/createticket";
import { ticketsApi } from "../lib/api";
import { selectCurrentUser } from "../redux/user/userSlice";

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface StatsResponse {
  success: boolean;
  data: {
    month: number;
    year: number;
    stats: Stats | { [department: string]: Stats };
  };
  message?: string;
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myStats, setMyStats] = useState<Stats | null>(null);
  const [depStats, setDepStats] = useState<{ [department: string]: Stats } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"myStats" | "depStats">("myStats");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const currentUser = useSelector(selectCurrentUser);

  // Set default department for admin
  useEffect(() => {
    if (currentUser?.role === "admin" && currentUser?.department) {
      setSelectedDepartment(currentUser.department);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyStats();
    if (currentUser?.role === "admin" || currentUser?.role === "super-admin") {
      fetchDepStats();
    }
  }, [month, year, selectedDepartment, currentUser]);

  async function fetchMyStats() {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/stats/mystats?month=${month}&year=${year}`;
      console.log("Fetching my stats from:", url);
      const response = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      console.log("My stats response:", {
        status: response.status,
        headers: [...response.headers.entries()],
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Unauthorized: Please log in again.");
        } else {
          setError(`Failed to fetch my stats: ${response.status} ${response.statusText}`);
        }
        return;
      }

      const data: StatsResponse = await response.json();
      console.log("My stats data:", data);

      if (data.success && data.data?.stats) {
        setMyStats(data.data.stats as Stats);
      } else {
        setError(data.message || "No personal stats data available");
      }
    } catch (error: any) {
      console.error("Error fetching my stats:", error.message);
      setError("Network error: Unable to fetch my stats. Check if the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepStats() {
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/stats/depstats?month=${month}&year=${year}`;
      console.log("Fetching department stats from:", url);
      const response = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      console.log("Department stats response:", {
        status: response.status,
        headers: [...response.headers.entries()],
      });

      if (!response.ok) {
        console.log(`Failed to fetch department stats: ${response.status} ${response.statusText}`);
        return;
      }

      const data: StatsResponse = await response.json();
      console.log("Department stats data:", data);

      if (data.success && data.data?.stats) {
        setDepStats(data.data.stats as { [department: string]: Stats });
      }
    } catch (error: any) {
      console.error("Error fetching department stats:", error.message);
    }
  }

  const handleTicketCreated = () => {
    setIsModalOpen(false);
    ticketsApi.getStats().then((data) => {
      setMyStats((prev) => ({ ...prev, ...data.data?.stats }));
      if (currentUser?.role === "admin" || currentUser?.role === "super-admin") {
        setDepStats((prev) => ({ ...prev, ...data.data?.stats }));
      }
    });
    fetchMyStats();
    if (currentUser?.role === "admin" || currentUser?.role === "super-admin") {
      fetchDepStats();
    }
  };

  const availableDepartments = ["IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"];
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const statCards = (statsData: Stats, department?: string) => [
    {
      title: department ? `${department} Total Tickets` : "Total Tickets",
      value: statsData.total,
      icon: Ticket,
      color: "bg-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      title: department ? `${department} Open` : "Open",
      value: statsData.open,
      icon: AlertCircle,
      color: "bg-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: department ? `${department} In Progress` : "In Progress",
      value: statsData.inProgress,
      icon: Activity,
      color: "bg-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
    },
    {
      title: department ? `${department} Closed` : "Closed",
      value: statsData.closed,
      icon: CheckCircle,
      color: "bg-gray-600",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
    },
  ];

  return (
    <Layout pageTitle="Dashboard">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
        {/* Welcome and Filters Section */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Welcome to POWERGRID Ticketing</h1>
          <p className="text-base sm:text-lg text-gray-600 mb-6">
            Manage and track IT support tickets with ease
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="block w-48 rounded-lg border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 transition-colors"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="block w-48 rounded-lg border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 transition-colors"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabbed Interface */}
          <div className="mt-8">
            <div className="flex border-b border-gray-200 mb-4">
              <button
                className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                  activeTab === "myStats"
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("myStats")}
              >
                My Stats
              </button>
              {(currentUser?.role === "admin" || currentUser?.role === "super-admin") && (
                <button
                  className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                    activeTab === "depStats"
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("depStats")}
                >
                  Department Stats
                </button>
              )}
            </div>

            {activeTab === "myStats" && (
              <div className="mt-4">
                {error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700 flex items-center justify-center gap-2">
                    <AlertCircle size={24} />
                    <p>{error}</p>
                    {error.includes("Unauthorized") && (
                      <Link to="/login" className="ml-2 text-blue-600 hover:underline font-medium">
                        Go to Login
                      </Link>
                    )}
                  </div>
                ) : loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse"
                      >
                        <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4 mx-auto" />
                        <div className="h-4 bg-gray-200 rounded w-28 mb-2 mx-auto" />
                        <div className="h-8 bg-gray-200 rounded w-16 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : !myStats ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-yellow-700 flex items-center justify-center gap-2">
                    <AlertCircle size={24} />
                    <p>No personal stats available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards(myStats).map((card) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={card.title}
                          className="relative bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 overflow-hidden"
                        >
                          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${card.bgColor} mb-4`}>
                            <Icon className={card.textColor} size={24} />
                          </div>
                          <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                          <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                          <div className={`absolute -right-8 -top-8 h-16 w-16 rounded-full ${card.color} opacity-10`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "depStats" && (currentUser?.role === "admin" || currentUser?.role === "super-admin") && (
              <div className="mt-4">
                {currentUser?.role === "super-admin" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="block w-48 rounded-lg border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 transition-colors"
                    >
                      <option value="all">All Departments</option>
                      {availableDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {depStats && selectedDepartment !== "all" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards(
                      depStats[selectedDepartment] || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 },
                      currentUser?.role === "admin" ? currentUser.department : selectedDepartment
                    ).map((card) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={card.title}
                          className="relative bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 overflow-hidden"
                        >
                          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${card.bgColor} mb-4`}>
                            <Icon className={card.textColor} size={24} />
                          </div>
                          <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                          <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                          <div className={`absolute -right-8 -top-8 h-16 w-16 rounded-full ${card.color} opacity-10`} />
                        </div>
                      );
                    })}
                  </div>
                ) : depStats && selectedDepartment === "all" ? (
                  Object.entries(depStats).map(([dept, deptStats]) => (
                    <div key={dept} className="col-span-full mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">{dept}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards(deptStats, dept).map((card) => {
                          const Icon = card.icon;
                          return (
                            <div
                              key={card.title}
                              className="relative bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 overflow-hidden"
                            >
                              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${card.bgColor} mb-4`}>
                                <Icon className={card.textColor} size={24} />
                              </div>
                              <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                              <div className={`absolute -right-8 -top-8 h-16 w-16 rounded-full ${card.color} opacity-10`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-yellow-700 flex items-center justify-center gap-2">
                    <AlertCircle size={24} />
                    <p>No department stats available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/tickets"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-medium border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              <Ticket size={20} />
              View All Tickets
            </Link>
            <Link
              to="/my-tickets"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50 transition-colors font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              <Activity size={20} />
              My Assigned Tickets
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              <AlertCircle size={20} />
              Create New Ticket
            </button>
            <CreateTicketModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onTicketCreated={handleTicketCreated}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}