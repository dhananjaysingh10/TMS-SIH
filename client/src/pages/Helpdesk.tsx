import {
    AlertCircle,
    Bot,
    Check,
    CheckCircle,
    ChevronLeft,
    Menu,
    MessageSquare,
    MoreVertical,
    Search,
    Send,
    User,
    X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import Layout from '../components/Layout';
import type { TemporaryTicket } from '../lib/api';
import { temporaryTicketsApi } from '../lib/api';
import { selectCurrentUser } from '../redux/user/userSlice';

const Helpdesk: React.FC = () => {
    const currentUser = useSelector(selectCurrentUser);
    const [searchParams] = useSearchParams();
    
    const [tickets, setTickets] = useState<TemporaryTicket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<TemporaryTicket[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<TemporaryTicket | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        if (!currentUser) return;
        const loadTickets = async () => {
            setIsLoading(true);
            try {
                const userId = currentUser.id || '';
                if (!userId) return;
                
                const data = await temporaryTicketsApi.getUserTickets(userId, false);
                setTickets(data);
                setFilteredTickets(data);

                // URL Param Handling
                const urlTicketId = searchParams.get('ticketId');
                if (urlTicketId) {
                    setSelectedTicketId(urlTicketId);
                    try {
                        const specific = await temporaryTicketsApi.getById(urlTicketId);
                        if(specific) {
                            setSelectedTicket(specific);
                            // Ensure it's in the list
                             if (!data.find(t => t.tempTicketId === specific.tempTicketId)) {
                                setTickets(prev => [specific, ...prev]);
                                setFilteredTickets(prev => [specific, ...prev]);
                            }
                        }
                    } catch (e) { console.error(e); }
                } else if (data.length > 0 && !selectedTicketId) {
                    // Mobile: Don't auto-select to show list first? 
                    // Desktop: Auto-select first
                    if (window.innerWidth > 1024) {
                        handleSelectTicket(data[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to load tickets", error);
                toast.error("Could not load chats.");
            } finally {
                setIsLoading(false);
            }
        };
        loadTickets();
    }, [currentUser, searchParams]);

    // Search Filter
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredTickets(tickets);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredTickets(tickets.filter(t => 
                (t.issueTitle || "").toLowerCase().includes(lower) || 
                (t.tempTicketId || "").toLowerCase().includes(lower)
            ));
        }
    }, [searchTerm, tickets]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTicket?.chatHistory]);

    const handleSelectTicket = async (ticket: TemporaryTicket) => {
        setSelectedTicketId(ticket.tempTicketId);
        // Optimistic switch
        setSelectedTicket(ticket);
        setIsSidebarOpen(false); // Close mobile sidebar
        
        // Fetch fresh details in background
        try {
            const fresh = await temporaryTicketsApi.getById(ticket.tempTicketId);
            setSelectedTicket(fresh);
            // Update list item
            setTickets(prev => prev.map(t => t.tempTicketId === fresh.tempTicketId ? fresh : t));
        } catch (e) {
            console.error("Bg fetch failed", e);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageInput.trim() || !selectedTicketId) return;
        const content = messageInput.trim();
        setMessageInput('');
        setIsSending(true);

        // Optimistic UI Append
        const tempMsg = { role: 'user', message: content, timestamp: new Date().toISOString() };
        setSelectedTicket(prev => prev ? { ...prev, chatHistory: [...prev.chatHistory, tempMsg as any] } : null);

        try {
            const result = await temporaryTicketsApi.addMessage(selectedTicketId, 'user', content);
            
            // Handle Auto-Resolution / Escalation responses
            if (result.resolved) {
                const aiMsg = { role: 'ai', message: result.aiReply || "Ticket resolved.", timestamp: new Date().toISOString() };
                setSelectedTicket(prev => prev ? { 
                    ...prev, 
                    chatHistory: [...prev.chatHistory, aiMsg as any],
                    autoResolved: true 
                } : null);
                
                toast.success("Ticket resolved!");
                // Remove from active list after short delay? Or keep as closed?
                // For now, remove from list to clean up
                setTickets(prev => prev.filter(t => t.tempTicketId !== selectedTicketId));
                setFilteredTickets(prev => prev.filter(t => t.tempTicketId !== selectedTicketId));
                return;
            }

            // Sync full state
            const updated = await temporaryTicketsApi.getById(selectedTicketId);
            setSelectedTicket(updated);
            
            // Re-order list to show latest at top
            setTickets(prev => {
                const others = prev.filter(t => t.tempTicketId !== updated.tempTicketId);
                return [updated, ...others];
            });

        } catch (error) {
            console.error(error);
            toast.error("Failed to send.");
            setMessageInput(content); // Revert
        } finally {
            setIsSending(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedTicketId || !window.confirm("Mark as resolved?")) return;
        try {
            await temporaryTicketsApi.resolve(selectedTicketId);
            toast.success("Resolved");
            setTickets(prev => prev.filter(t => t.tempTicketId !== selectedTicketId));
            setSelectedTicketId(null);
            setSelectedTicket(null);
        } catch (e) { toast.error("Error resolving."); }
    };

    const handleEscalate = async () => {
        if (!selectedTicketId || !window.confirm("Escalate to human agent?")) return;
        try {
            await temporaryTicketsApi.escalate(selectedTicketId);
            toast.success("Escalated to agent");
            const updated = await temporaryTicketsApi.getById(selectedTicketId);
            setSelectedTicket(updated);
        } catch (e) { toast.error("Error escalating."); }
    };

    const handleBackToTasks = () => {
        setSelectedTicketId(null);
        setSelectedTicket(null);
        setIsSidebarOpen(true); // Show list on mobile essentially
    };

    if (!currentUser) return <div className="p-10 text-center">Please log in.</div>;

    return (
        <Layout pageTitle="Helpdesk">
            <div className="flex h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                
                {/* --- SIDEBAR (Ticket List) --- */}
                <div className={`
                    absolute inset-y-0 left-0 z-30 w-full md:w-80 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                    ${isSidebarOpen || !selectedTicketId ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-600" />
                                Chats
                            </h2>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                                {tickets.length}
                            </span>
                        </div>
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Ticket List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center p-8 text-gray-400">
                                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No chats found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredTickets.map(ticket => (
                                    <button
                                        key={ticket.tempTicketId}
                                        onClick={() => handleSelectTicket(ticket)}
                                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors relative group
                                            ${selectedTicketId === ticket.tempTicketId ? 'bg-indigo-50/60' : ''}
                                        `}
                                    >
                                        {selectedTicketId === ticket.tempTicketId && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />
                                        )}
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-semibold text-sm truncate pr-2 ${selectedTicketId === ticket.tempTicketId ? 'text-indigo-900' : 'text-gray-800'}`}>
                                                {ticket.issueTitle || "Untitled Inquiry"}
                                            </h3>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {new Date(ticket.lastActivityAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate line-clamp-1 h-4">
                                            {ticket.chatHistory?.[ticket.chatHistory.length-1]?.message || "No messages"}
                                        </p>
                                        
                                        <div className="flex gap-2 mt-2">
                                            {ticket.escalatedToTicket && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                                    <AlertCircle className="w-3 h-3" /> Escalated
                                                </span>
                                            )}
                                            {ticket.autoResolved && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                                                    <CheckCircle className="w-3 h-3" /> Resolved
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MAIN CHAT AREA --- */}
                
                {/* Mobile Overlay Background */}
                {isSidebarOpen && (
                    <div 
                        className="md:hidden absolute inset-0 z-20 bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <div className="flex-1 flex flex-col bg-slate-50 relative w-full">
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handleBackToTasks} 
                                        className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 leading-tight line-clamp-1">{selectedTicket.issueTitle}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>ID: {selectedTicket.tempTicketId.split('-')[1]}</span>
                                            {selectedTicket.escalatedToTicket && (
                                                <span className="flex items-center text-amber-600 font-medium bg-amber-50 px-1 rounded">
                                                    Escalated
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Actions */}
                                    {!selectedTicket.autoResolved && !selectedTicket.escalatedToTicket && (
                                        <>
                                            <button 
                                                onClick={handleResolve}
                                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 border border-green-200 hover:bg-green-50 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                title="Mark as Resolved"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Resolve
                                            </button>
                                            <button 
                                                onClick={handleEscalate}
                                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                title="Escalate to Human"
                                            >
                                                <User className="w-3.5 h-3.5" /> Escalate
                                            </button>
                                            
                                            {/* Mobile Menu for Actions */}
                                            <div className="sm:hidden relative group">
                                                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 hidden group-hover:block z-20">
                                                    <button onClick={handleResolve} className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2">
                                                        <Check className="w-4 h-4" /> Resolve
                                                    </button>
                                                    <button onClick={handleEscalate} className="w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2">
                                                        <User className="w-4 h-4" /> Escalate
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                                {(selectedTicket.chatHistory || []).map((msg, idx) => {
                                    const isAi = msg.role === 'ai';
                                    return (
                                        <div key={idx} className={`flex gap-3 max-w-3xl ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                                            {/* Avatar */}
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1
                                                ${isAi ? 'bg-white border border-gray-100 text-indigo-600' : 'bg-indigo-600 text-white'}
                                            `}>
                                                {isAi ? <Bot className="w-5 h-5" /> : <User className="w-4 h-4" />}
                                            </div>
                                            
                                            {/* Bubble */}
                                            <div className={`
                                                relative px-5 py-3.5 shadow-sm text-sm sm:text-base leading-relaxed
                                                ${isAi 
                                                    ? 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm' 
                                                    : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm'
                                                }
                                            `}>
                                                {isAi ? (
                                                     <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-a:text-indigo-600 hover:prose-a:text-indigo-500">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {msg.message}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-pre-wrap">{msg.message}</div>
                                                )}
                                                
                                                <div className={`text-[10px] mt-2 opacity-70 ${isAi ? 'text-gray-400' : 'text-indigo-200 text-right'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                <div ref={messagesEndRef} className="h-4" />
                            </div>

                            {/* Input Area */}
                            {!selectedTicket.autoResolved && !selectedTicket.escalatedToTicket ? (
                                <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-10">
                                    <form 
                                        onSubmit={handleSendMessage} 
                                        className="max-w-4xl mx-auto relative flex items-center gap-2"
                                    >
                                        <input
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            placeholder="Type your message..."
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full pl-5 pr-12 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            disabled={isSending}
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!messageInput.trim() || isSending}
                                            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-md group"
                                        >
                                            <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </form>
                                    <div className="text-center mt-2">
                                        <p className="text-[10px] text-gray-400">AI can make mistakes. Please verify important information.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-500 shadow-sm">
                                        {selectedTicket.escalatedToTicket ? "Ticket escalated to human agent" : "Conversation marked as resolved"}
                                    </div>
                                </div>
                            )}

                        </>
                    ) : (
                         /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                                <Bot className="w-10 h-10 text-indigo-200" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Helpdesk</h2>
                            <p className="text-gray-500 max-w-sm mb-8">
                                Select an existing conversation from the list or create a new ticket to start chatting with our AI assistant.
                            </p>
                            <button 
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden px-6 py-2.5 bg-indigo-600 text-white rounded-full font-medium shadow-md shadow-indigo-200 hover:shadow-lg transition-all"
                            >
                                View Chats
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Helpdesk;