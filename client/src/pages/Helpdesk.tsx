import { AlertCircle, Check, CheckCircle, Menu, MessageSquare, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import type { TemporaryTicket } from '../lib/api';
import { temporaryTicketsApi } from '../lib/api';
import { selectCurrentUser } from '../redux/user/userSlice';

const Helpdesk: React.FC = () => {
    const currentUser = useSelector(selectCurrentUser);
    const [searchParams] = useSearchParams();
    
    const [tickets, setTickets] = useState<TemporaryTicket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<TemporaryTicket | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load & URL Param Handling
    useEffect(() => {
        if (!currentUser) return;

        const loadTickets = async () => {
            setIsLoading(true);
            try {
                // Fetch unresolved tickets by default
                const userId = currentUser.id || '';
                if (!userId) {
                     toast.error("User ID missing");
                     return;
                }
                const data = await temporaryTicketsApi.getUserTickets(userId, false);
                setTickets(data);

                // LOCAL STORAGE LOGIC: Store IDs with 24h expiry
                const LS_KEY = 'temp_tickets_store';
                const now = Date.now();
                const ONE_DAY = 24 * 60 * 60 * 1000;
                
                // 1. Clean expired
                let localStore = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
                localStore = localStore.filter((item: any) => now - item.timestamp < ONE_DAY);
                
                // 2. Add new from API (refresh timestamps of active ones?)
                // Or just ensure current ones are there.
                data.forEach(t => {
                    if (!localStore.find((item: any) => item.id === t.tempTicketId)) {
                        localStore.push({ id: t.tempTicketId, timestamp: now });
                    }
                });
                
                localStorage.setItem(LS_KEY, JSON.stringify(localStore));


                // Check URL for ticketId to auto-select and fetch FULL details
                const urlTicketId = searchParams.get('ticketId');
                if (urlTicketId) {
                    setSelectedTicketId(urlTicketId);
                    try {
                        const specific = await temporaryTicketsApi.getById(urlTicketId);
                        if (specific) {
                            setSelectedTicket(specific);
                            // Update or Add to list
                            setTickets(prev => {
                                const exists = prev.find(p => p.tempTicketId === specific.tempTicketId);
                                if (exists) return prev.map(p => p.tempTicketId === specific.tempTicketId ? specific : p);
                                return [specific, ...prev];
                            });
                        }
                    } catch (err) {
                        console.error("Could not fetch specific ticket details", err);
                        // Fallback to local data if available
                        const found = data.find(t => t.tempTicketId === urlTicketId);
                        if (found) setSelectedTicket(found);
                        else toast.error("Ticket details could not be loaded");
                    }
                } else if (data.length > 0 && !selectedTicketId) {
                    // Auto select first if none selected, but fetch details too!
                    const firstId = data[0].tempTicketId;
                    setSelectedTicketId(firstId);
                    // Fetch details for first one
                    try {
                         const specific = await temporaryTicketsApi.getById(firstId);
                         setSelectedTicket(specific);
                    } catch (e) {
                         setSelectedTicket(data[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to load helpdesk tickets", error);
                toast.error("Failed to load chat history");
            } finally {
                setIsLoading(false);
            }
        };

        loadTickets();
    }, [currentUser, searchParams]); // Re-run if URL params change

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTicket?.chatHistory]);

    const handleSelectTicket = async (ticket: TemporaryTicket) => {
        setSelectedTicketId(ticket.tempTicketId);
        // Optimistically set selected ticket from list mostly, but maybe fetch fresh?
        // For now, let's use what we have or fetch specific to be safe about history
        try {
            const freshTicket = await temporaryTicketsApi.getById(ticket.tempTicketId);
            setSelectedTicket(freshTicket);
            // Update list version too
            setTickets(prev => prev.map(t => t.tempTicketId === freshTicket.tempTicketId ? freshTicket : t));
        } catch (error) {
            console.error(error);
            setSelectedTicket(ticket); // Fallback
        }
        setIsSidebarOpen(false); // Close mobile sidebar on selection
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageInput.trim() || !selectedTicketId) return;

        const content = messageInput.trim();
        setMessageInput('');
        setIsSending(true);

        try {
            // Optimistic UI update? 
            // Better to wait for server response since it might contain AI reply immediately
            const result = await temporaryTicketsApi.addMessage(selectedTicketId, 'user', content);
            
            if (result.resolved) {
                // 1. Manually append the messages locally so user sees the "Close" sequence
                const userMsg = { role: 'user', message: content, timestamp: new Date().toISOString() };
                const aiMsg = { role: 'ai', message: result.aiReply || "Ticket resolved.", timestamp: new Date().toISOString() };
                
                // Update the SELECTED ticket state to show these messages
                setSelectedTicket(prev => {
                    if(!prev) return null;
                    return {
                        ...prev,
                        chatHistory: [...prev.chatHistory, userMsg as any, aiMsg as any], // Cast because ChatMessage might differ slightly locally
                        autoResolved: true // Mark as resolved to disable input
                    };
                });
                
                toast.success(result.aiReply || "Ticket resolved and closed.");

                // 2. Remove from the Sidebar List (since backend deleted it)
                setTickets(prev => prev.filter(t => t.tempTicketId !== selectedTicketId));
                
                // 3. DO NOT clear selectedTicketId/selectedTicket immediately. 
                // Let user read the "Goodbye" message.
                // It stays open until they click something else.
                return; 
            }

            if (result.escalated) {
                toast.success("Ticket has been auto-escalated to an agent.");
                // Refresh ticket to show escalation status
            }

            // Ideally we just fetch the ticket again to sync everything (AI reply, etc)
            const updatedTicket = await temporaryTicketsApi.getById(selectedTicketId);
            setSelectedTicket(updatedTicket);
            setTickets(prev => prev.map(t => t.tempTicketId === updatedTicket.tempTicketId ? updatedTicket : t));

        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message");
            setMessageInput(content); // Restore input
        } finally {
            setIsSending(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedTicketId) return;
        if (!window.confirm("Are you sure you want to mark this issue as resolved?")) return;

        try {
            await temporaryTicketsApi.resolve(selectedTicketId);
            toast.success("Ticket resolved and removed.");
            
            // Remove from State
            const ticketIdToRemove = selectedTicketId;
            setTickets(prev => prev.filter(t => t.tempTicketId !== ticketIdToRemove));
            setSelectedTicketId(null);
            setSelectedTicket(null);

            // Remove from LocalStorage
            const LS_KEY = 'temp_tickets_store';
            try {
                const localStore = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
                const newStore = localStore.filter((item: any) => item.id !== ticketIdToRemove);
                localStorage.setItem(LS_KEY, JSON.stringify(newStore));
            } catch (e) {
                console.error("LS Error", e);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to resolve ticket");
        }
    };

    const handleEscalate = async () => {
        if (!selectedTicketId) return;
        if (!window.confirm("Escalate this to a human agent? A permanent ticket will be created.")) return;

        try {
            await temporaryTicketsApi.escalate(selectedTicketId);
            toast.success("Ticket escalated successfully!");
            // Refresh to show escalated status
            const updatedTicket = await temporaryTicketsApi.getById(selectedTicketId);
            setSelectedTicket(updatedTicket);
            setTickets(prev => prev.map(t => t.tempTicketId === updatedTicket.tempTicketId ? updatedTicket : t));
        } catch (error) {
            console.error(error);
            toast.error("Failed to escalate ticket");
        }
    };

    if (!currentUser) return <div className="p-8">Please log in to access Helpdesk.</div>;

    return (
        <Layout pageTitle="Helpdesk">
        <div className="flex h-[calc(100vh-120px)] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            {/* Mobile Sidebar Toggle */}
            <button 
                className="lg:hidden fixed top-20 left-4 z-20 p-2 bg-white rounded shadow"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                <Menu size={20} />
            </button>

            {/* Sidebar (Ticket List) */}
            <div className={`
                fixed inset-y-0 left-0 z-10 w-80 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0 pt-16' : '-translate-x-full lg:pt-0'}
            `}>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                        <MessageSquare size={20} /> Helpdesk Chats
                    </h2>
                </div>
                <div className="overflow-y-auto h-full pb-20">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">Loading chats...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No active helpdesk chats.</p>
                            <p className="text-sm mt-2">Start a new ticket to chat with our AI assistant.</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <div 
                                key={ticket.tempTicketId}
                                onClick={() => handleSelectTicket(ticket)}
                                className={`cursor-pointer p-4 border-b border-gray-100 hover:bg-blue-50 transition-colors ${selectedTicketId === ticket.tempTicketId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-900 truncate w-3/4">
                                        {ticket.issueTitle || "Untitled Issue"}
                                    </span>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(ticket.lastActivityAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                    {ticket.chatHistory && ticket.chatHistory.length > 0 
                                        ? ticket.chatHistory[ticket.chatHistory.length - 1].message 
                                        : "No messages"}
                                </p>
                                {ticket.escalatedToTicket && (
                                    <span className="inline-flex mt-2 items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Escalated
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
                {selectedTicket ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-[5]">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{selectedTicket.issueTitle}</h3>
                                <p className="text-sm text-gray-500">ID: {selectedTicket.tempTicketId}</p>
                            </div>
                            <div className="flex gap-2">
                                {!selectedTicket.escalatedToTicket && !selectedTicket.autoResolved && (
                                    <>
                                        <button 
                                            onClick={handleResolve}
                                            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 text-sm font-medium transition-colors"
                                        >
                                            <CheckCircle size={16} /> Mark Resolved
                                        </button>
                                        <button 
                                            onClick={handleEscalate}
                                            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 border border-yellow-200 text-sm font-medium transition-colors"
                                        >
                                            <AlertCircle size={16} /> Escalate to Agent
                                        </button>
                                    </>
                                )}
                                {selectedTicket.escalatedToTicket && (
                                    <span className="flex items-center gap-1 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md font-medium text-sm">
                                        Escalated to Agent
                                    </span>
                                )}
                                {selectedTicket.autoResolved && (
                                     <span className="flex items-center gap-1 px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium text-sm">
                                        <Check size={16} /> Resolved
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {(selectedTicket.chatHistory || []).map((msg, idx) => {
                                const isAi = msg.role === 'ai';
                                return (
                                    <div key={idx} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                                        <div 
                                            className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-4 py-3 shadow-sm ${
                                                isAi 
                                                    ? 'bg-white text-gray-800 border border-gray-100' 
                                                    : 'bg-blue-600 text-white'
                                            }`}
                                        >
                                            <div className="text-sm md:text-base whitespace-pre-wrap">{msg.message}</div>
                                            <div className={`text-[10px] mt-1 text-right ${isAi ? 'text-gray-400' : 'text-blue-100'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {!selectedTicket.autoResolved && !selectedTicket.escalatedToTicket && (
                            <div className="bg-white border-t border-gray-200 p-4">
                                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={isSending}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={isSending || !messageInput.trim()}
                                        className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </form>
                                <div className="mt-2 flex sm:hidden justify-center gap-2">
                                     {/* Mobile Action Buttons */}
                                     <button onClick={handleResolve} className="flex-1 py-2 bg-green-50 text-green-700 text-xs rounded border border-green-200">Mark Resolved</button>
                                     <button onClick={handleEscalate} className="flex-1 py-2 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200">Escalate</button>
                                </div>
                            </div>
                        )}
                         {(selectedTicket.autoResolved || selectedTicket.escalatedToTicket) && (
                            <div className="bg-gray-100 border-t border-gray-200 p-4 text-center text-gray-500 text-sm">
                                This conversation is closed.
                            </div>
                         )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <MessageSquare size={64} className="mb-4 text-gray-200" />
                        <h3 className="text-xl font-medium text-gray-600">Select a ticket to chat</h3>
                        <p className="mt-2">Or create a new ticket to start a conversation with our AI.</p>
                    </div>
                )}
            </div>
        </div>
        </Layout>
    );
};

export default Helpdesk;
