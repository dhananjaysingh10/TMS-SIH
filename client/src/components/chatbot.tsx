import { useEffect, useRef, useState } from "react";
import { Minimize2, Send, Sparkles, Zap, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Ticket } from "@/lib/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/user/userSlice";

type TicketChatbotProps = {
  ticket: Ticket;
  onClose: () => void;
};

export const TicketChatbot = ({ ticket, onClose }: TicketChatbotProps) => {
  // Default welcome message
  const defaultMessage = {
    id: "default-1",
    role: "ai",
    text: `Hello! I'm your AI assistant. I see you're reviewing ticket **"${ticket.title}"**. \n\nHow can I help you resolve this issue?`,
  };

  const [messages, setMessages] = useState<any[]>([defaultMessage]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const user = useSelector(selectCurrentUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- 1. FETCH HISTORY EFFECT ---
  useEffect(() => {
    const fetchHistory = async () => {
      if (!ticket._id) return;

      try {
        setIsLoadingHistory(true);
        const response = await fetch(
          `http://localhost:8000/api/chat/${ticket._id}`
        );
        
        if (response.ok) {
          const history = await response.json();
          if (Array.isArray(history) && history.length > 0) {
            const formattedHistory = history.map((msg, index) => ({
              id: `hist-${index}`,
              role: msg.role,
              text: msg.text,
            }));
            setMessages([defaultMessage, ...formattedHistory]);
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [ticket._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingHistory]);

  const handleSend = async (e: any) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), role: "user", text: inputText };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const payload = {
        ticketId: ticket._id,
        userMessage: userMsg.text,
        user_email: user?.email,
        ticketContext: `Title: ${ticket.title}\nDescription: ${ticket.description}`,
      };

      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      const aiMsg = {
        id: Date.now() + 1,
        role: "ai",
        text: data.response,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorMsg = {
        id: Date.now() + 1,
        role: "ai",
        text: "I'm having trouble reaching the neural core. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 sm:bottom-24 right-2 sm:right-6 md:right-8 w-[calc(100vw-16px)] sm:w-96 md:w-[500px] h-[calc(100vh-120px)] sm:h-[40vw] md:h-[80vh] max-h-screen bg-gradient-to-b from-white to-slate-50 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 transition-all">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-500 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between text-white overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full transform -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 relative z-10 min-w-0">
          <div className="p-2 sm:p-2.5 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 shadow-lg flex-shrink-0">
            <Sparkles size={18} className="sm:w-5 sm:h-5 text-yellow-200 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base leading-tight truncate">AI Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-xs text-blue-100 font-medium truncate">Always here to help</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 sm:p-2 hover:bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-110 relative z-10 flex-shrink-0"
          aria-label="Close chatbot"
        >
          <Minimize2 size={18} className="sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 space-y-4 bg-gradient-to-b from-white via-slate-50 to-blue-50/30 scrollbar-hide">
        {isLoadingHistory && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}

        {!isLoadingHistory && messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-3 duration-300`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm leading-relaxed shadow-md transition-all duration-200 ${
                  isUser
                    ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-sm sm:rounded-br-md font-medium break-words"
                    : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm sm:rounded-bl-md shadow-sm hover:shadow-md break-words"
                }`}
              >
                {/* --- MARKDOWN RENDERING --- */}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style headers
                    h1: ({node, ...props}) => <h1 className="text-base font-bold mt-2 mb-1" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-sm font-bold mt-2 mb-1" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xs font-bold mt-1.5 mb-1 uppercase opacity-80" {...props} />,
                    // Style lists
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    // Style paragraphs
                    p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                    // Style links
                    a: ({node, ...props}) => <a className="underline decoration-dotted font-medium hover:decoration-solid" target="_blank" rel="noopener noreferrer" {...props} />,
                    // Style code blocks vs inline code
                    code: ({node, className, children, ...props}: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match && !String(children).includes('\n');
                      return (
                        <code 
                          className={`${isInline 
                            ? `px-1 py-0.5 rounded font-mono text-xs ${isUser ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-700'}` 
                            : `block p-2 rounded-md font-mono text-xs overflow-x-auto my-2 border ${isUser ? 'bg-blue-800 border-blue-600' : 'bg-slate-50 border-slate-200'}`
                          }`} 
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    strong: ({node, ...props}) => <strong className="font-bold opacity-100" {...props} />
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-2xl rounded-bl-sm sm:rounded-bl-md shadow-md flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 bg-white border-t border-slate-100 shadow-lg flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 sm:gap-2.5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask AI..."
              className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder:text-slate-400 placeholder:font-medium"
            />
            <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none flex-shrink-0">
              <Zap size={14} className="sm:w-4 sm:h-4" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-2 sm:p-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg sm:rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 font-medium flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={16} className="sm:w-4.5 sm:h-4.5" strokeWidth={2.5} />
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2 sm:mt-2.5 font-medium text-center">
          Powered by AI
        </p>
      </div>
    </div>
  );
};