import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import {
  AlertCircle,
  Edit,
  Save,
  X,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Briefcase,
  Calendar,
  MessageSquare,
} from "lucide-react";
import Layout from "../components/Layout";
import axios from "axios";

interface User {
  _id: string;
  name: string;
  email: string;
  primaryPhone?: string;
  profilePicture: string;
  role: "user" | "admin" | "super-admin";
  department:
    | "IT"
    | "DevOps"
    | "Software"
    | "Networking"
    | "Cybersecurity"
    | "Other"
    | "NA";
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
    telegramId: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    async function fetchUser() {
      try {
        if (currentUser?.id) {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/user/${currentUser.id}`
          );
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setFormError(null);
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/user/update/${currentUser?.id}`,
        formData
      );
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super-admin":
        return "bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border border-rose-200";
      case "admin":
        return "bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200";
      default:
        return "bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 border border-sky-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Layout pageTitle="My Profile">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 animate-pulse shadow-lg">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-32 w-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full" />
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32" />
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24" />
              </div>
            </div>
            <div className="md:w-2/3 bg-gradient-to-br from-white/80 to-gray-50/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 animate-pulse shadow-lg">
              <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"
                  />
                ))}
              </div>
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
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <AlertCircle
              className="mx-auto text-muted-foreground mb-4"
              size={48}
            />
            <p className="text-muted-foreground">
              {error || "No user data found"}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Profile">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your personal information and settings
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium w-full md:w-auto"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6">
              <div className="flex flex-col items-center space-y-4">
                {/* Avatar */}
                <div className="relative h-32 w-32">
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="h-32 w-32 rounded-full object-cover border-4 border-primary/10"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
                    }}
                  />
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    {user.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-semibold rounded-full capitalize ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role.replace("-", " ")}
                  </span>
                </div>

                <div className="w-full h-px bg-border my-4" />

                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{user.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Joined{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information Card */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Personal Information
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditing
                  ? "Update your personal details below"
                  : "View and manage your account information"}
              </p>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <UserIcon className="h-4 w-4" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="primaryPhone"
                        value={formData.primaryPhone}
                        onChange={handleInputChange}
                        placeholder="Enter your phone number"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MessageSquare className="h-4 w-4" />
                        Telegram ID
                      </label>
                      <input
                        type="text"
                        name="telegramId"
                        value={formData.telegramId}
                        onChange={handleInputChange}
                        placeholder="@username"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Briefcase className="h-4 w-4" />
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
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

                  <div className="h-px bg-border" />

                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center justify-center px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors font-medium"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField
                      icon={<UserIcon className="h-4 w-4" />}
                      label="Full Name"
                      value={user.name}
                    />
                    <InfoField
                      icon={<Mail className="h-4 w-4" />}
                      label="Email Address"
                      value={user.email}
                    />
                    <InfoField
                      icon={<Phone className="h-4 w-4" />}
                      label="Phone Number"
                      value={user.primaryPhone}
                    />
                    <InfoField
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="Telegram ID"
                      value={user.telegramId}
                    />
                    <InfoField
                      icon={<Shield className="h-4 w-4" />}
                      label="Role"
                      value={user.role.replace("-", " ")}
                      capitalize
                    />
                    <InfoField
                      icon={<Briefcase className="h-4 w-4" />}
                      label="Department"
                      value={user.department}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  capitalize?: boolean;
}

function InfoField({ icon, label, value, capitalize }: InfoFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p
        className={`text-foreground font-medium ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}
