"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, User as UserIcon } from "lucide-react";
import Layout from "../components/Layout";
import { selectCurrentUser } from "../redux/user/userSlice";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "super-admin";
  department: string;
  primaryPhone?: string;
  profilePicture?: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempRole, setTempRole] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        console.error("Error fetching users:", data.message);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, role: newRole as "user" | "admin" | "super-admin" } : user
          )
        );
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole as "user" | "admin" | "super-admin" } : null));
      } else {
        console.error("Error updating user role:", data.message);
        // Revert tempRole on failure
        setTempRole(selectedUser?.role || "");
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      // Revert tempRole on failure
      setTempRole(selectedUser?.role || "");
    }
  }

  const departments = ["all", ...new Set(users.map((user) => user.department))].sort();
  const availableDepartments = ["IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"];

  const renderSection = (department: string) => {
    const departmentUsers = users.filter((user) => user.department === department);
    return (
      <div key={department} className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{department}</h2>
          <div className="mt-2 text-sm text-gray-500">
            {departmentUsers.length} user{departmentUsers.length !== 1 ? "s" : ""}
          </div>
        </div>
        {departmentUsers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-gray-500">No users in this department</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departmentUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedUser(user);
                      setTempRole(user.role);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout pageTitle="User Management">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
                <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
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
    <Layout pageTitle="User Management">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            View and manage all users across different departments
          </p>
          {currentUser?.role === "super-admin" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Select Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value="all">All Departments</option>
              </select>
            </div>
          )}
        </div>
        <div className="space-y-8">
          {currentUser?.role === "super-admin" && selectedDepartment !== "all"
            ? renderSection(selectedDepartment)
            : departments.filter((dept) => dept !== "all").map((department) => renderSection(department))}
        </div>
      </div>

      {/* Modal for user details */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                <UserIcon size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{selectedUser.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
                <p className="text-gray-900">{selectedUser.primaryPhone || "N/A"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="text-gray-900">{selectedUser.department}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                {currentUser?.role === "super-admin" ? (
                  <select
                    value={tempRole}
                    onChange={(e) => {
                      setTempRole(e.target.value);
                      updateUserRole(selectedUser._id, e.target.value);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{selectedUser.role}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
                <img
                  src={selectedUser.profilePicture}
                  alt={`${selectedUser.name}'s profile`}
                  className="h-16 w-16 rounded-full object-cover"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}