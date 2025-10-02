"use client";

import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { ticketsApi, type TicketStats } from "../lib/api";
import { Activity, AlertCircle, CheckCircle, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const data = await ticketsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: "Total Tickets",
      value: stats.total,
      icon: Ticket,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Open",
      value: stats.open,
      icon: AlertCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Activity,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
    {
      title: "Closed",
      value: stats.closed,
      icon: CheckCircle,
      color: "bg-gray-500",
      bgColor: "bg-gray-50",
      textColor: "text-gray-600",
    },
  ];

  return (
    <Layout pageTitle="Dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to POWERGRID Ticketing
          </h1>
          <p className="text-gray-600">
            Manage and track IT support tickets efficiently
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`inline-flex p-3 rounded-lg ${card.bgColor} mb-4`}
                  >
                    <Icon className={card.textColor} size={24} />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/tickets"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Ticket size={20} />
              View All Tickets
            </Link>
            <Link
              to="/my-tickets"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-500 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Activity size={20} />
              My Assigned Tickets
            </Link>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
              <AlertCircle size={20} />
              Create New Ticket
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
