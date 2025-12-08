"use client";

import { useEffect, useState } from "react";
import { Home, Ticket, User, X, Users, BarChart3, FolderKanban, ChevronDown, ChevronRight } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { usersApi } from "../lib/api";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProduct {
  _id: string;
  name: string;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const currentUser = useSelector(selectCurrentUser);
  const location = useLocation();
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [myProducts, setMyProducts] = useState<UserProduct[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const products = await usersApi.getMyProducts();
        console.log("Fetched user products:", products);
        setMyProducts(products || []);
      } catch (err) {
        console.error("Failed to fetch user products", err);
        // Fallback: show no products message but log error
        setMyProducts([]);
      }
    };
    if (currentUser) {
      fetchProducts();
    }
  }, [currentUser]);

  // Auto-expand menus based on current path
  useEffect(() => {
    if (location.pathname.startsWith("/tickets")) {
      setTicketsExpanded(true);
    }
    if (location.pathname.startsWith("/my-tickets")) {
      setMyTicketsExpanded(true);
    }
  }, [location.pathname]);

  const [myTicketsExpanded, setMyTicketsExpanded] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/created-by-me", icon: User, label: "Tickets Created by Me" },
    ...(currentUser?.role === "admin" || currentUser?.role === "super-admin"
      ? [
        { path: "/admin-dashboard", icon: BarChart3, label: "Analytics Dashboard" },
        { path: "/product-management", icon: FolderKanban, label: "Product Management" },
      ]
      : []),
    ...(currentUser?.role === "super-admin"
      ? [{ path: "/users", icon: Users, label: "User Management" }]
      : []),
  ];

  const isTicketsActive = location.pathname.startsWith("/tickets");
  const isMyTicketsActive = location.pathname.startsWith("/my-tickets");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        role="dialog"
        aria-modal={isOpen ? "true" : "false"}
        aria-label="Sidebar navigation"
        className={`fixed top-0 left-0 z-50 h-full w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="leading-tight">
            <p className="text-xl font-bold text-blue-600">POWERGRID</p>
            <p className="text-sm text-gray-500">Ticketing</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex h-[calc(100%-65px)] flex-col overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {/* Home link */}
            <li>
              <NavLink
                to="/"
                end
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors outline-none",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-blue-600"
                        aria-hidden="true"
                      />
                    )}
                    <span className="rounded-md p-2 bg-gray-100 text-gray-600 group-hover:bg-gray-200" aria-hidden="true">
                      <Home size={18} />
                    </span>
                    <span className="text-pretty">Home</span>
                  </>
                )}
              </NavLink>
            </li>

            {/* Tickets expandable menu */}
            <li>
              <button
                onClick={() => setTicketsExpanded(!ticketsExpanded)}
                className={[
                  "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors outline-none w-full",
                  isTicketsActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                {isTicketsActive && (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-blue-600"
                    aria-hidden="true"
                  />
                )}
                <span className="rounded-md p-2 bg-gray-100 text-gray-600 group-hover:bg-gray-200" aria-hidden="true">
                  <Ticket size={18} />
                </span>
                <span className="text-pretty flex-1 text-left">Tickets</span>
                {ticketsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {/* Product sub-items */}
              {ticketsExpanded && (
                <ul className="ml-8 mt-1 space-y-1">
                  {myProducts.length === 0 ? (
                    <li className="text-xs text-gray-400 px-4 py-2">No products assigned</li>
                  ) : (
                    myProducts.map((product) => (
                      <li key={product._id}>
                        <NavLink
                          to={`/tickets/${product._id}`}
                          onClick={onClose}
                          className={({ isActive }) =>
                            [
                              "block px-4 py-2 text-sm rounded-lg transition-colors",
                              isActive
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100",
                            ].join(" ")
                          }
                        >
                          {product.name}
                        </NavLink>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>

            {/* My Tickets expandable menu */}
            <li>
              <button
                onClick={() => setMyTicketsExpanded(!myTicketsExpanded)}
                className={[
                  "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors outline-none w-full",
                  isMyTicketsActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                {isMyTicketsActive && (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-blue-600"
                    aria-hidden="true"
                  />
                )}
                <span className="rounded-md p-2 bg-gray-100 text-gray-600 group-hover:bg-gray-200" aria-hidden="true">
                  <User size={18} />
                </span>
                <span className="text-pretty flex-1 text-left">Tickets Assigned to Me</span>
                {myTicketsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {/* Product sub-items for My Tickets */}
              {myTicketsExpanded && (
                <ul className="ml-8 mt-1 space-y-1">
                  {myProducts.length === 0 ? (
                    <li className="text-xs text-gray-400 px-4 py-2">No products assigned</li>
                  ) : (
                    myProducts.map((product) => (
                      <li key={product._id}>
                        <NavLink
                          to={`/my-tickets/${product._id}`}
                          onClick={onClose}
                          className={({ isActive }) =>
                            [
                              "block px-4 py-2 text-sm rounded-lg transition-colors",
                              isActive
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100",
                            ].join(" ")
                          }
                        >
                          {product.name}
                        </NavLink>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>

            {/* Other nav items */}
            {navItems.slice(1).map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === "/"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors outline-none",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-blue-600"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={[
                          "rounded-md p-2",
                          "bg-gray-100 text-gray-600",
                          "group-hover:bg-gray-200",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        <Icon size={18} />
                      </span>
                      <span className="text-pretty">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-4 text-xs text-gray-400">
            <span className="sr-only">Version</span>
            <p>v1.0.0</p>
          </div>
        </nav>
      </aside>
    </>
  );
}
