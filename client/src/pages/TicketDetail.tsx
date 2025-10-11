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
  Loader2,
  Calendar,
  UserCheck,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";

const priorityColors = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-sky-50 text-sky-700 border-sky-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusColors = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "in-progress": "bg-sky-50 text-sky-700 border-sky-200",
  resolved: "bg-teal-50 text-teal-700 border-teal-200",
  closed: "bg-slate-50 text-slate-600 border-slate-200",
};

interface ChatMessageType {
  _id?: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
    profilePicture?: string;
  };
  content: string;
  attachment?: string;
  mimeType?: string;
  createdAt: string | Date;
}

function canViewCommentsAndActivity(
  ticket: Ticket | null,
  currentUser: any
): boolean {
  if (!ticket || !currentUser) return false;
  if (ticket.createdBy.email === currentUser.email) return false;
  return true;
}

function canAcceptTicket(ticket: Ticket | null, currentUser: any): boolean {
  if (!ticket || !currentUser) return false;
  if (ticket.createdBy.email === currentUser.email) return false;
  return true;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({
    accept: false,
    unaccept: false,
    resolve: false,
    open: false,
  });
  const currentUser = useSelector(selectCurrentUser);
  const useremail = currentUser ? currentUser.email : "";
  const userId = currentUser ? currentUser.id : "";

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:10000", {
      transports: ["websocket"],
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

  useEffect(() => {
    if (ticket?.ticketId && socketRef.current) {
      socketRef.current.emit("joinTicket", ticket.ticketId);

      socketRef.current.on(
        "newMessage",
        (data: { ticketId: string; message: ChatMessageType }) => {
          if (data.ticketId === ticket.ticketId) {
            setChatMessages((prev) => [...prev, data.message]);
          }
        }
      );

      return () => {
        socketRef.current?.off("newMessage");
      };
    }
  }, [ticket?.ticketId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchComments();
      fetchActivities();
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
      toast.error("Failed to fetch ticket details");
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
      toast.error("Failed to fetch comments");
    }
  }

  async function fetchActivities() {
    try {
      if (!id) return;
      const data = await activitiesApi.getByTicket(id);
      setActivities(data);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to fetch activities");
    }
  }

  async function fetchChatMessages(ticketId?: string) {
    try {
      const ticketIdToUse = ticketId || ticket?.ticketId;
      if (!ticketIdToUse) return;

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:10000/api"
        }/messages/${ticketIdToUse}/messages`,
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
      toast.error("Failed to fetch chat messages");
    }
  }

  async function handleAcceptTicket() {
    if (!ticket) return;
    setButtonLoading((prev) => ({ ...prev, accept: true }));
    try {
      await ticketsApi.acceptTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
      toast.success("Ticket accepted successfully");
    } catch (error) {
      console.error("Error accepting ticket:", error);
      toast.error("Failed to accept ticket");
    } finally {
      setButtonLoading((prev) => ({ ...prev, accept: false }));
    }
  }

  async function handleOpenTicket() {
    if (!ticket) return;
    setButtonLoading((prev) => ({ ...prev, open: true }));
    try {
      await ticketsApi.openTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
      toast.success("Ticket reopened successfully");
    } catch (error) {
      console.error("Error opening ticket:", error);
      toast.error("Failed to reopen ticket");
    } finally {
      setButtonLoading((prev) => ({ ...prev, open: false }));
    }
  }

  async function handleUnacceptTicket() {
    if (!ticket) return;
    setButtonLoading((prev) => ({ ...prev, unaccept: true }));
    try {
      await ticketsApi.unacceptTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
      toast.success("Ticket unclaimed successfully");
    } catch (error) {
      console.error("Error unaccepting ticket:", error);
      toast.error("Failed to unclaim ticket");
    } finally {
      setButtonLoading((prev) => ({ ...prev, unaccept: false }));
    }
  }

  async function handleResolveTicket() {
    if (!ticket) return;
    setButtonLoading((prev) => ({ ...prev, resolve: true }));
    try {
      await ticketsApi.resolveTicket(ticket._id, useremail);
      fetchTicketDetails();
      fetchActivities();
      toast.success("Ticket resolved successfully");
    } catch (error) {
      console.error("Error resolving ticket:", error);
      toast.error("Failed to resolve ticket");
    } finally {
      setButtonLoading((prev) => ({ ...prev, resolve: false }));
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
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Failed to add message:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <Layout pageTitle="Loading...">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 animate-pulse">
              <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-6" />
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
                <div className="h-4 bg-slate-200 rounded w-4/6" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout pageTitle="Ticket Not Found">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <AlertCircle className="text-slate-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Ticket Not Found
            </h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              The ticket you're looking for doesn't exist or may have been
              removed.
            </p>
            <button
              onClick={() => navigate("/tickets")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
            >
              <ArrowLeft size={18} />
              Back to Tickets
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={`Ticket ${ticket.ticketId}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors font-medium group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-white p-6 sm:p-8 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex items-center text-base font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                        #{ticket.ticketId}
                      </span>
                      <span
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                          statusColors[ticket.status]
                        }`}
                      >
                        {ticket.status.replace("-", " ").toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border ${
                          priorityColors[ticket.priority]
                        }`}
                      >
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                      {ticket.subject}
                    </h1>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="text-slate-600" size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Requester
                      </p>
                      <p className="font-semibold text-slate-900 truncate">
                        {ticket.createdBy.name}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {ticket.createdBy.email}
                      </p>
                    </div>
                  </div>

                  {ticket.assignedTo && (
                    <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-slate-100">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <UserCheck className="text-emerald-600" size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                          Assigned To
                        </p>
                        <p className="font-semibold text-slate-900 truncate">
                          {ticket.assignedTo.name}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          {ticket.assignedTo.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tag className="text-slate-600" size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Category
                      </p>
                      <p className="font-semibold text-slate-900 capitalize">
                        {ticket.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="text-slate-600" size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Created
                      </p>
                      <p className="font-semibold text-slate-900 text-sm">
                        {formatDateTime(ticket.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Description
                </h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 px-6 sm:px-8 py-5 border-t border-slate-200">
                <div className="flex flex-wrap gap-3">
                  {canAcceptTicket(ticket, currentUser) && !ticket.accepted && (
                    <button
                      onClick={handleAcceptTicket}
                      disabled={buttonLoading.accept}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-sm hover:shadow ${
                        buttonLoading.accept
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {buttonLoading.accept ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Accept Ticket
                        </>
                      )}
                    </button>
                  )}
                  {canAcceptTicket(ticket, currentUser) &&
                    ticket.accepted &&
                    ticket.status !== "resolved" && (
                      <button
                        onClick={handleUnacceptTicket}
                        disabled={buttonLoading.unaccept}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-medium shadow-sm hover:shadow ${
                          buttonLoading.unaccept
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {buttonLoading.unaccept ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Unclaiming...
                          </>
                        ) : (
                          <>
                            <AlertCircle size={18} />
                            Unclaim
                          </>
                        )}
                      </button>
                    )}
                  {ticket.accepted &&
                    ticket.status !== "resolved" &&
                    ticket.assignedTo?._id === userId && (
                      <button
                        onClick={handleResolveTicket}
                        disabled={buttonLoading.resolve}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-medium shadow-sm hover:shadow ${
                          buttonLoading.resolve
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {buttonLoading.resolve ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            Resolve Ticket
                          </>
                        )}
                      </button>
                    )}
                  {ticket.status === "resolved" && (
                    <button
                      onClick={handleOpenTicket}
                      disabled={buttonLoading.open}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all font-medium shadow-sm hover:shadow ${
                        buttonLoading.open
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {buttonLoading.open ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Reopening...
                        </>
                      ) : (
                        <>
                          <AlertCircle size={18} />
                          Open Again
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {canViewCommentsAndActivity(ticket, currentUser) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 sm:px-8 py-5 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                      <MessageSquare size={16} className="text-white" />
                    </div>
                    Comments
                  </h2>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
                          <MessageSquare className="text-slate-400" size={20} />
                        </div>
                        <p className="text-slate-500 text-sm">
                          No comments yet. Be the first to comment!
                        </p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment._id}
                          className="bg-slate-50 rounded-lg p-4 border-l-4 border-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <User size={16} className="text-slate-600" />
                            </div>
                            <span className="font-semibold text-sm text-slate-900">
                              {comment.user.name}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed ml-10">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (newComment.trim()) handleAddComment();
                          }
                        }}
                        placeholder="Add your comment... (Press Enter to send)"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow placeholder:text-slate-400"
                        disabled={submitting}
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={submitting || !newComment.trim()}
                      className="px-5 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm hover:shadow flex-shrink-0"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {canViewCommentsAndActivity(ticket, currentUser) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 sm:px-8 py-5 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                      <Clock size={16} className="text-white" />
                    </div>
                    Activity Log
                  </h2>
                </div>
                <div className="p-6 sm:p-8">
                  <ActivityTimeline activities={activities} />
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100vh-200px)] flex flex-col sticky top-6">
              <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                  Live Chat
                </h2>
                <p className="text-xs text-slate-500 mt-1 ml-10">
                  Real-time conversation with support
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <MessageSquare className="text-slate-400" size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium mb-1">
                      No messages yet
                    </p>
                    <p className="text-slate-400 text-xs">
                      Start the conversation!
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <ChatMessage
                      key={msg._id || index}
                      message={msg}
                      isOwnMessage={msg.user._id === userId}
                    />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {ticket?.ticketId && (
                <div className="p-4 border-t border-slate-200 bg-white">
                  <ChatInput
                    ticketId={ticket.ticketId}
                    onMessageSent={() => {}}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
