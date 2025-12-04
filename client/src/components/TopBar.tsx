import { Bell, Loader2, Menu, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import { useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { signoutSuccess } from '../redux/user/userSlice';
import { useNavigate } from 'react-router-dom';
import { useNotificationsFeed, formatNotificationTime } from "../hooks/useNotificationsFeed";

interface TopBarProps {
  onMenuClick: () => void;
  pageTitle: string;
}

export default function TopBar({ onMenuClick, pageTitle }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    refresh: refreshNotifications,
    unreadCount,
  } = useNotificationsFeed(currentUser);

  const previewNotifications = notifications.slice(0, 5);
  
  const [lastSeenIds, setLastSeenIds] = useState<string[]>([]);
  const [seenIdsLoading, setSeenIdsLoading] = useState(true);

useEffect(() => {
  const fetchSeenNotifications = async () => {    
    if (!currentUser) {
      console.log('⚠️ No current user, skipping fetch');
      setSeenIdsLoading(false);
      return;
    }

    try {
      const fullUrl = `${import.meta.env.VITE_API_URL}/api/user/seen-notifications`;
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
      //  console.log('✅ Data received:', data);
        setLastSeenIds(data.seenNotificationIds || []);
      } else {
        console.error('Response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch seen notifications:', error);
    } finally {
      setSeenIdsLoading(false);
    }
  };

  fetchSeenNotifications();
}, [currentUser]);

  // Mark notifications as seen in MongoDB
  const markNotificationsAsSeen = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/mark-notifications-seen`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ notificationIds }),
        }
      );

      if (response.ok) {
        setLastSeenIds(prev => [...new Set([...prev, ...notificationIds])]);
      }
    } catch (error) {
      console.error('Failed to mark notifications as seen:', error);
    }
  };

  // Check if there are any new notification IDs we haven't seen
  const currentNotificationIds = notifications
    .filter(n => n.isNew)
    .map(n => n.id);
  
  const hasNewNotifications = currentNotificationIds.some(
    id => !lastSeenIds.includes(id)
  );

  // Show indicator if there are new notifications we haven't seen
  const showIndicator = !seenIdsLoading && hasNewNotifications && unreadCount > 0;

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
    } catch (error: any) {
      console.error("Error during logout:", error);
      toast.error(error.response?.data?.message || 'Signout failed');
    }
    setShowUserMenu(false); 
  };

  const handleToggleUserMenu = () => {
    setShowNotifications(false);
    setShowUserMenu((prev) => !prev);
  };

  const handleToggleNotifications = () => {
    setShowUserMenu(false);
    const wasOpen = showNotifications;
    setShowNotifications((prev) => !prev);
    
    // When opening, mark current notification IDs as seen
    if (!wasOpen && currentNotificationIds.length > 0) {
      markNotificationsAsSeen(currentNotificationIds);
    }
  };

  const handleViewAllNotifications = () => {
    setShowNotifications(false);
    // Mark all current notifications as seen
    if (currentNotificationIds.length > 0) {
      markNotificationsAsSeen(currentNotificationIds);
    }
    navigate("/notifications");
  };

  // Update seen IDs when notifications panel is open
  useEffect(() => {
    if (showNotifications && currentNotificationIds.length > 0) {
      markNotificationsAsSeen(currentNotificationIds);
    }
  }, [showNotifications, notifications]);

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
        {/* Notifications Bell */}
        <div className="relative">

<<<<<<< HEAD
      <div
        onClick={handleToggleNotifications}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleToggleNotifications();
          }
        }}
        className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="Notifications"
      >
        <Bell size={24} className="text-gray-800" />
        {showIndicator && (
          <span 
            className="absolute rounded-full shadow-sm bg-red-500"
            style={{ 
              width: '8px', 
              height: '8px',
              top: '10px',
              right: '11.5px'
            }}
          ></span>
        )}
      </div>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Notifications
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshNotifications();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Refresh
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {notificationsLoading && (
                    <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500">
                      <Loader2 className="animate-spin" size={16} />
                      Loading notifications...
                    </div>
                  )}

                  {!notificationsLoading && notificationsError && (
                    <div className="px-4 py-3 text-sm text-red-600 bg-red-50">
                      {notificationsError}
                    </div>
                  )}

                  {!notificationsLoading && !notificationsError && previewNotifications.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  )}

                  {!notificationsLoading && previewNotifications.length > 0 && (
                    <div className="divide-y divide-gray-100">
                      {previewNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            navigate(notification.link);
                            setShowNotifications(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none transition-colors ${
                            notification.isNew ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {notification.category}
                            </span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatNotificationTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {notification.description}
                          </p>
                          {notification.isNew && (
                            <span className="inline-block mt-1 text-xs font-semibold text-blue-600">
                              New
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {previewNotifications.length > 0 && (
                  <button
                    onClick={handleViewAllNotifications}
                    className="w-full px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 border-t border-gray-100 transition-colors"
                  >
                    View all notifications
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
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
        
=======
        {currentUser ? (
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
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/signin')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
            >
              Sign Up
            </button>
          </div>
        )}

>>>>>>> 311896e (edit sigin/signup button)
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </header>
  );
}