import { Menu, Search, User } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { signoutSuccess } from '../redux/user/userSlice';
import { useNavigate } from 'react-router-dom';
interface TopBarProps {
  onMenuClick: () => void;
  pageTitle: string;
}

export default function TopBar({ onMenuClick, pageTitle }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/signout`, {
        method: "POST",
        credentials: "include", 
      });
      if (response.ok) {
        dispatch(signoutSuccess());
        navigate('/signin');
      } 
    } catch (error:any) {
      console.error("Error during logout:", error);
      toast.error(error.response?.data?.message || 'Signout failed');
    }
    setShowUserMenu(false); 
  };
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Menu size={24} />
        </button>

        <h2 className="text-xl font-semibold text-gray-800">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search tickets..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-all"
          />
        </div>

        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors overflow-hidden cursor-pointer"
            aria-label="User menu"
          >
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt="Profile"
                className="w-10 h-10 min-w-10 min-h-10 rounded-full object-cover"
                style={{ width: "40px", height: "40px" }}
                onError={(e) => {
                  console.error("Profile picture failed to load:", currentUser?.profilePicture);
                  e.currentTarget.style.display = "none";
                }}
                onLoad={(e) => {
                  console.log("Profile picture loaded successfully");
                  console.log("Natural dimensions:", {
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight,
                  });
                }}
              />
            ) : (
              <User size={20} className="text-gray-600" />
            )}
          </div>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 text-gray-800 font-semibold">
                  Hi, {currentUser?.name || "User"}
                </div>
                <hr className="my-1 border-gray-200" />
                <a
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Profile
                </a>
                <a
                  href="/settings"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Settings
                </a>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>

      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </header>
  );
}