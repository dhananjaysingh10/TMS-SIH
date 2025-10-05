import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";
import ActivityTimeline from "@/components/activity";
import { io, Socket } from "socket.io-client";
import {
  ticketsApi,
  commentsApi,
  activitiesApi,
  type Ticket,
  type Message,
  type Activity,
  type NewMessageData,
} from "../lib/api";
import {
  ArrowLeft,
  User,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Send,
} from "lucide-react";

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusColors = {
  open: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  resolved: "bg-purple-100 text-purple-700",
  closed: "bg-gray-100 text-gray-600",
};

interface ChatMessage {
  _id?: string;
  user: {
    _id: string;
    name?: string;  
    email?: string;
    profilePicture?: string;
  };
  content: string;
  attachment?: string;
  createdAt: string | Date;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const useremail = currentUser ? currentUser.email : "";
  const userId = currentUser ? currentUser.id : "";
  
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
  socketRef.current = io("http://localhost:10000", {
    transports: ['websocket'],
    withCredentials: true,
  });


    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current?.id);
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Join ticket room and listen for new messages
  useEffect(() => {
    if (ticket?.ticketId && socketRef.current) {
      socketRef.current.emit("joinTicket", ticket.ticketId);

      socketRef.current.on("newMessage", (data: { ticketId: string; message: ChatMessage }) => {
        if (data.ticketId === ticket.ticketId) {
          setChatMessages((prev) => [...prev, data.message]);
        }
      });

      return () => {
        socketRef.current?.off("newMessage");
      };
    }
  }, [ticket?.ticketId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchComments();
      fetchActivities();
      //fetchChatMessages();
    }
  }, [id]);

  async function fetchTicketDetails() {
    try {
      if (!id) return;
      const data = await ticketsApi.getById(id);
      setTicket(data);
      fetchChatMessages(data.ticketId);
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      if (!id) return;
      const data = await commentsApi.getByTicket(id);
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }

  async function fetchActivities() {
    try {
      if (!id) return;
      const data = await activitiesApi.getByTicket(id);
      setActivities(data);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }

async function fetchChatMessages(ticketId?: string) {  
  try {
    const ticketIdToUse = ticketId || ticket?.ticketId;  
    if (!ticketIdToUse) return;
    
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"}/messages/${ticketIdToUse}/messages`,
      {
        credentials: "include",
      }
    );
    if (response.ok) {
      const data = await response.json();
      setChatMessages(data);
    }
  } catch (error) {
    console.error("Error fetching chat messages:", error);
  }
}

  async function handleAcceptTicket() {
    if (!ticket) return;

    try {
      await ticketsApi.acceptTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
    } catch (error) {
      console.error("Error accepting ticket:", error);
    }
  }

  async function handleOpenTicket() {
    if (!ticket) return;

    try {
      await ticketsApi.openTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
    } catch (error) {
      console.error("Error opening ticket:", error);
    }
  }

  async function handleUnacceptTicket() {
    if (!ticket) return;

    try {
      await ticketsApi.unacceptTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
    } catch (error) {
      console.error("Error unaccepting ticket:", error);
    }
  }

  async function handleResolveTicket() {
    if (!ticket) return;
    try {
      await ticketsApi.resolveTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
    } catch (error) {
      console.error("Error resolving ticket:", error);
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const messageData = {
        useremail: currentUser ? currentUser.email : "test-user@gmail.com",
        content: newComment,
      };
      
      await commentsApi.create(ticket ? ticket._id : "", messageData);
      fetchComments();
      setNewComment("");
    } catch (error) {
      console.error("Failed to add message:", error);
    } finally {
      setSubmitting(false);
    }
  };

const handleSendChatMessage = async () => {
  if (!newChatMessage.trim() || !ticket?.ticketId) return;
  setSendingChat(true);
  try {
    await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"}/messages/${ticket.ticketId}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newChatMessage, attachment: "" }),
      }
    );
    // Do not push to state here; wait for "newMessage" from server
    setNewChatMessage("");
  } catch (e) {
    console.error("Send chat failed:", e);
  } finally {
    setSendingChat(false);
  }
};


  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatChatTime(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <Layout pageTitle="Loading...">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout pageTitle="Ticket Not Found">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ticket Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The ticket you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/tickets")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Tickets
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={`Ticket ${ticket.ticketId}`}>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Ticket Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-blue-600">
                      #{ticket.ticketId}
                    </span>
                    <span
                      className={`text-sm px-3 py-1 rounded-full font-medium ${
                        statusColors[ticket.status]
                      }`}
                    >
                      {ticket.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span
                      className={`text-sm px-3 py-1 rounded-full font-medium ${
                        priorityColors[ticket.priority]
                      }`}
                    >
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {ticket.subject}
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <User className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-600">Requester</p>
                    <p className="font-medium text-gray-900">
                      {ticket.createdBy.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {ticket.createdBy.email}
                    </p>
                  </div>
                </div>

                {ticket.assignedTo && (
                  <div className="flex items-start gap-3">
                    <User className="text-gray-400 mt-1" size={18} />
                    <div>
                      <p className="text-sm text-gray-600">Assigned To</p>
                      <p className="font-medium text-gray-900">
                        {ticket.assignedTo.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {ticket.assignedTo.email}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Tag className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {ticket.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="text-gray-400 mt-1" size={18} />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(ticket.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {!ticket.accepted && (
                  <button
                    onClick={handleAcceptTicket}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    <CheckCircle size={18} />
                    Accept Ticket
                  </button>
                )}
                {ticket.accepted && ticket.status !== "resolved" && (
                  <button
                    onClick={handleUnacceptTicket}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    <CheckCircle size={18} />
                    Unclaim
                  </button>
                )}
                {ticket.accepted && ticket.status !== "resolved" && (
                  <button
                    onClick={handleResolveTicket}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    <CheckCircle size={18} />
                    Resolve Ticket
                  </button>
                )}
                {ticket.status === "resolved" && (
                  <button
                    onClick={handleOpenTicket}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    <CheckCircle size={18} />
                    Open Again
                  </button>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                Comments
              </h2>

              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment._id}
                      className="border-l-2 border-blue-500 pl-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-start gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newComment.trim()) handleAddComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                  rows={1}
                />
                <button
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={20} />
                Activity Log
              </h2>
              <ActivityTimeline activities={activities} />
            </div>
          </div>

          {/* Right Column - Real-time Chat */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)] flex flex-col sticky top-6">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Live Chat
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Real-time conversation
                </p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  chatMessages.map((msg, index) => {
                      console.log('Message:', msg);
                      console.log('msg.user._id:', msg.user._id, 'userId:', userId);
                    const isOwnMessage = msg.user._id === userId;
                    return (
                      <div
                        key={msg._id || index}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] ${
                            isOwnMessage
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          } rounded-lg px-4 py-2`}
                        >
                          {!isOwnMessage && (
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {msg.user.name || "User"}
                            </p>
                          )}
                          <p className="text-sm break-words">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            {formatChatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (newChatMessage.trim()) handleSendChatMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={sendingChat}
                    rows={2}
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={sendingChat || !newChatMessage.trim()}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}