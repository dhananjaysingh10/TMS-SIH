"use client";

import { useEffect } from "react";
import { Home, Ticket, User, X, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const currentUser = useSelector(selectCurrentUser);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/tickets", icon: Ticket, label: "Tickets" },
  { path: "/my-tickets", icon: User, label: "Tickets Assigned to Me" },
  { path: "/created-by-me", icon: User, label: "Tickets Created by Me" },
  ...(currentUser?.role === "super-admin"
    ? [{ path: "/users", icon: Users, label: "User Management" }]
    : []),
];

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
        className={`fixed top-0 left-0 z-50 h-full w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
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
            {navItems.map(({ path, icon: Icon, label }) => (
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
                  aria-current={({ isActive}) =>
                    isActive ? "page" : undefined
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
