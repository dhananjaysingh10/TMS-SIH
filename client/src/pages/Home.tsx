"use client";

import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { ticketsApi, type TicketStats } from "../lib/api";
import { Activity, AlertCircle, CheckCircle, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import CreateTicketModal from "../components/createticket";
export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const handleTicketCreated = () => {
    setIsModalOpen(false);
    fetchStats();
  };
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
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 md:p-8">
          <h1 className="text-balance text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-3">
            Welcome to POWERGRID Ticketing
          </h1>
          <p className="text-pretty text-base md:text-lg text-gray-600">
            Manage and track IT support tickets efficiently
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
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
                  className="relative overflow-hidden bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 ring-1 ring-inset ring-gray-200 mb-4">
                    <Icon className="text-gray-700" size={24} />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                  <p className="text-4xl font-semibold tracking-tight text-gray-900">
                    {card.value}
                  </p>
                  <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gray-50" />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/tickets"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-medium border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              <Ticket size={20} />
              View All Tickets
            </Link>
            <Link
              to="/my-tickets"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              <Activity size={20} />
              My Assigned Tickets
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors font-medium border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
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
