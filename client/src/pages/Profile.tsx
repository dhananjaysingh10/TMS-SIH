import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { AlertCircle, Edit, Save, X } from "lucide-react";
import Layout from "../components/Layout";
import axios from "axios";

interface User {
  _id: string;
  name: string;
  email: string;
  primaryPhone?: string;
  profilePicture: string;
  role: "user" | "admin" | "super-admin";
  department: "IT" | "DevOps" | "Software" | "Networking" | "Cybersecurity" | "Other" | "NA";
  telegramId?: string; 
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    primaryPhone: "",
    department: "NA",
    telegramId: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    async function fetchUser() {
      try {
        if (currentUser?.id) {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/${currentUser.id}`);
          if (response.data.success) {
            setUser(response.data.data);
            setFormData({
              name: response.data.data.name,
              email: response.data.data.email,
              primaryPhone: response.data.data.primaryPhone || "",
              department: response.data.data.department,
              telegramId: response.data.data.telegramId,
            });
          } else {
            setError(response.data.message || "Failed to fetch user data");
          }
        } else {
          setError("No user ID available");
        }
      } catch (err) {
        setError("Error fetching user data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setFormError(null);
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/user/update/${currentUser?.id}`, formData);
      if (response.data.success) {
        setUser(response.data.data);
        setIsEditing(false);
      } else {
        setFormError(response.data.message || "Failed to update profile");
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Error updating profile");
    }
  };

  const handleCancel = () => {
    setFormError(null);
    setIsEditing(false);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        primaryPhone: user.primaryPhone || "",
        department: user.department,
        telegramId: user.telegramId || "",
      });
    }
  };

  const renderProfileField = (label: string, value: string | undefined) => (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-gray-900">{value || "Not provided"}</span>
    </div>
  );

  if (loading) {
    return (
      <Layout pageTitle="My Profile">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-24 w-24 bg-gray-200 rounded-full" />
              <div>
                <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout pageTitle="My Profile">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-gray-500">{error || "No user data found"}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Profile">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">Your personal information</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit className="mr-2" size={16} />
              Edit Profile
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-6 mb-6">
            <img
              src={user.profilePicture}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
              }}
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              {formError && (
                <div className="bg-red-100 text-red-700 p-3 rounded-md">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-500">Telegram ID</label>
                  <input
                    type="telegram"
                    name="telegram"
                    value={formData.telegramId}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <input
                    type="text"
                    name="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="NA">Not Assigned</option>
                    <option value="IT">IT</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Software">Software</option>
                    <option value="Networking">Networking</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleSave}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Save className="mr-2" size={16} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  <X className="mr-2" size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderProfileField("Name", user.name)}
              {renderProfileField("Email", user.email)}
              {renderProfileField("Phone", user.primaryPhone)}
              {renderProfileField("Role", user.role)}
              {renderProfileField("Department", user.department)}
              {renderProfileField("Telegram Id", user.telegramId)}
              {renderProfileField(
                "Account Created",
                new Date(user.createdAt).toLocaleDateString()
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}