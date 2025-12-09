// temporaryTicket.controller.js
import crypto from "crypto";
import fetch from "node-fetch";
import { createClient } from "redis";
import TemporaryTicket from "../models/temporaryTicket.model.js";
import User from "../models/user.model.js";

const TEMP_TICKET_ESCALATE_QUEUE = "temp_ticket_escalate_queue";
const CHATBOT_SERVICE_URL = "http://localhost:8001/suggest";

/**
 * Get Redis client with connection
 */
const getRedisClient = async () => {
  const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  return client;
};

/**
 * Create a new temporary ticket when user starts chatbot session
 * POST /api/temporary-ticket
 */
export const createTemporaryTicket = async (req, res) => {
  try {
    const { userId, userEmail, issueTitle } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: "userId and userEmail are required",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate unique temp ticket ID
    const tempTicketId = `TEMP-${crypto.randomUUID()}`;

    const newTempTicket = new TemporaryTicket({
      tempTicketId,
      userId,
      userEmail,
      issueTitle: issueTitle || "",
      chatHistory: [],
    });

    const savedTicket = await newTempTicket.save();

    res.status(201).json({
      success: true,
      message: "Temporary ticket created successfully",
      data: {
        tempTicketId: savedTicket.tempTicketId,
        _id: savedTicket._id,
      },
    });
  } catch (error) {
    console.error("Error creating temporary ticket:", error);
    res.status(500).json({
      success: false,
      message: "Error creating temporary ticket",
      error: error.message,
    });
  }
};

/**
 * Helper function to escalate a temporary ticket
 */
export const escalateInternal = async (ticket, issueTitle, issueDescription) => {
    // Avoid double escalation
    if (ticket.escalatedToTicket) return { success: false, message: "Already escalated" };
    if (ticket.autoResolved) return { success: false, message: "Already resolved" };

    try {
        const chatHistory = ticket.exportChatHistory();
        
        // Robust Title Logic: 
        // 1. Use provided title
        // 2. Use existing title (if not empty)
        // 3. Generate from first user message
        // 4. Fallback to generic
        let finalTitle = issueTitle;
        if (!finalTitle) {
             if (ticket.issueTitle && ticket.issueTitle.trim().length > 0) {
                 finalTitle = ticket.issueTitle;
             } else {
                 const firstMsg = chatHistory.find(m => m.role === 'user');
                 if (firstMsg && firstMsg.message) {
                     finalTitle = firstMsg.message.substring(0, 60);
                     if (firstMsg.message.length > 60) finalTitle += "...";
                 }
             }
        }
        finalTitle = finalTitle || "Support Request";

        const escalationPayload = {
            tempTicketId: ticket.tempTicketId,
            userId: ticket.userId.toString(),
            userEmail: ticket.userEmail,
            issueTitle: finalTitle,
            issueDescription: issueDescription || generateDescriptionFromChat(chatHistory),
            chatHistory: chatHistory,
            createdAt: new Date().toISOString(),
        };

        const redisClient = await getRedisClient();
        await redisClient.lPush(
            TEMP_TICKET_ESCALATE_QUEUE,
            JSON.stringify(escalationPayload)
        );
        await redisClient.disconnect();

        // Update DB
        ticket.escalatedToTicket = true;
        ticket.issueContext = issueDescription || ticket.issueContext || "";
        ticket.issueTitle = finalTitle;
        ticket.lastActivityAt = new Date();
        await ticket.save();

        return { success: true, tempTicketId: ticket.tempTicketId };
    } catch (error) {
        console.error("Escalation Internal Error: ", error);
        throw error;
    }
};

/**
 * Add a chat message to the temporary ticket
 * POST /api/temporary-ticket/:id/message
 */
export const addChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, message } = req.body;

    if (!role || !message) {
      return res.status(400).json({
        success: false,
        message: "role and message are required",
      });
    }

    // 1. Save the User's Message
    const ticket = await TemporaryTicket.findOneAndUpdate(
      { tempTicketId: id },
      {
        $push: {
          chatHistory: {
            $each: [{
              role,
              message,
              timestamp: new Date(),
            }],
            $slice: -50 // Keep the last 50 messages
          }
        },
        $set: { lastActivityAt: new Date() },
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Temporary ticket not found" });
    }

    // 2. Check for Negative Keywords (Auto-Escalation) - PRIORITIZE NEGATIVE TO AVOID FALSE POSITIVE RESOLUTION
    const escalationKeywords = ["not satisfied", "unsatisfied", "didn't help", "useless", "still active", "not resolved", "not working", "fail"];
    const lowerMessage = message.toLowerCase(); // Define lowerMessage here first
    
    if (escalationKeywords.some(kw => lowerMessage.includes(kw))) {
         console.log(`[Escalation] User is NOT satisfied. Escalating ticket ${id}`);
         
         // Get the ORIGINAL first user message as the description (not the "not satisfied" message)
         const originalDescription = generateDescriptionFromChat(ticket.chatHistory);
         const escalationResult = await escalateInternal(ticket, ticket.issueTitle || "Issue from Helpdesk", originalDescription);
         
         if (escalationResult.success) {
             return res.status(200).json({
                success: true,
                message: "Ticket escalated",
                data: {
                    tempTicketId: id,
                    escalated: true,
                    aiReply: "I apologize that I couldn't help. I have escalated this ticket to a human agent who will contact you shortly."
                }
            });
         }
    }

    // 2.5 Check for Resolution Keywords (User Satisfaction)
    const resolutionKeywords = ["thank", "thanks", "i am satisfied", "satisfied", "issue is solved", "solved", "goodbye", "bye", "ok bye", "close ticket"];
    // lowerMessage already defined above
    
    if (resolutionKeywords.some(kw => lowerMessage.includes(kw))) {
        console.log(`[Resolution] User is satisfied. Deleting ticket ${id}`);
        // Delete the ticket immediately
        await TemporaryTicket.findOneAndDelete({ tempTicketId: id });
        
        return res.status(200).json({
            success: true,
            message: "Ticket resolved and deleted",
            data: {
                tempTicketId: id,
                resolved: true,
                aiReply: "Thank you! I'm glad I could help. The ticket has been closed."
            }
        });
    }



    // 3. If it's a USER message, Call Chatbot Service
    if (role === 'user') {
        try {
            // Prepare chat history for context
            // Map mongoose subdocuments to plain objects expected by python service
            const historyForAi = ticket.chatHistory.map(msg => ({
                role: msg.role,
                message: msg.message
            }));

            const response = await fetch(CHATBOT_SERVICE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: message,
                    chat_history: historyForAi
                })
            });

            if (!response.ok) {
                console.error("Chatbot Service Failed:", response.statusText);
                // Fallback: Just let the user's message sit there? Or send a "Service Unavailable" message?
                // For now, we continue.
            } else {
                const aiData = await response.json();
                
                // 3. Check if Solution Found
                if (aiData.found_solution === false) {
                    
                    if (!ticket.escalatedToTicket) {
                        // AUTO-ESCALATE (First time)
                        console.log(`[Auto-Escalate] No solution found for ${id}`);
                        
                        // Add AI explanation message
                        ticket.chatHistory.push({
                            role: "ai",
                            message: "I couldn't find a solution in the documentation. I am automatically escalating this to a human agent."
                        });
                        
                        await ticket.save();

                        // Trigger Escalation - use ORIGINAL first user message, not current message
                        const originalDescription = generateDescriptionFromChat(ticket.chatHistory);
                        await escalateInternal(ticket, ticket.issueTitle || "Auto-Escalated: No Solution Found", originalDescription);
                        
                        return res.status(200).json({
                            success: true,
                            message: "Message added and ticket auto-escalated",
                            data: {
                                tempTicketId: ticket.tempTicketId,
                                messageCount: ticket.chatHistory.length,
                                escalated: true,
                                aiReply: "I couldn't find a solution in the documentation. I am automatically escalating this to a human agent."
                            }
                        });
                    } else {
                         // ALREADY ESCALATED - Just chat appropriately
                         console.log(`[Chat] Ticket ${id} already escalated. No new escalation.`);
                         
                         ticket.chatHistory.push({
                            role: "ai",
                            message: aiData.answer || "I cannot help further, a human agent will be with you shortly."
                        });
                        await ticket.save();
                    }

                } else {
                    // Normal Response (Solution Found)
                    ticket.chatHistory.push({
                        role: "ai",
                        message: aiData.answer
                    });
                    await ticket.save();
                }
            }
        } catch (botError) {
            console.error("Chatbot Error:", botError);
            // Don't fail the request, just log it. 
        }
    }

    // Return current state (re-fetch to be sure)
    const finalTicket = await TemporaryTicket.findOne({ tempTicketId: id });

    res.status(200).json({
      success: true,
      message: "Chat message added successfully",
      data: {
        tempTicketId: finalTicket.tempTicketId,
        messageCount: finalTicket.chatHistory.length,
        // Return latest message to help frontend
        latestMessage: finalTicket.chatHistory[finalTicket.chatHistory.length - 1] 
      },
    });
  } catch (error) {
    console.error("Error adding chat message:", error);
    res.status(500).json({
      success: false,
      message: "Error adding chat message",
      error: error.message,
    });
  }
};

/**
 * Mark temporary ticket as auto-resolved (user satisfied with chatbot)
 * POST /api/temporary-ticket/:id/resolve
 */
export const markAutoResolved = async (req, res) => {
  try {
    const { id } = req.params;

    // Permanently delete the temporary ticket as request is resolved
    const deleted = await TemporaryTicket.findOneAndDelete({ tempTicketId: id });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Temporary ticket not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Issue resolved and temporary ticket deleted.",
    });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    res.status(500).json({
      success: false,
      message: "Error resolving ticket",
      error: error.message,
    });
  }
};

/**
 * Escalate temporary ticket to permanent ticket
 * Pushes to Redis queue for worker to process
 * POST /api/temporary-ticket/:id/escalate
 */
export const escalateToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { issueTitle, issueDescription } = req.body;

    // Find the temporary ticket
    const tempTicket = await TemporaryTicket.findOne({ tempTicketId: id });

    if (!tempTicket) {
      return res.status(404).json({
        success: false,
        message: "Temporary ticket not found",
      });
    }

    const result = await escalateInternal(tempTicket, issueTitle, issueDescription);

    if (!result.success && result.message) {
         return res.status(400).json({
            success: false,
            message: result.message
         });
    }

    res.status(200).json({
      success: true,
      message: "Temporary ticket escalated successfully. A permanent ticket will be created shortly.",
      data: {
        tempTicketId: tempTicket.tempTicketId,
        escalatedToTicket: true,
      },
    });
  } catch (error) {
    console.error("Error escalating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Error escalating ticket",
      error: error.message,
    });
  }
};

/**
 * Get temporary ticket by ID
 * GET /api/temporary-ticket/:id
 */
export const getTemporaryTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await TemporaryTicket.findOne({ tempTicketId: id }).populate(
      "userId",
      "name email"
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Temporary ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Error fetching temporary ticket:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching temporary ticket",
      error: error.message,
    });
  }
};

/**
 * Get chat history for a temporary ticket
 * GET /api/temporary-ticket/:id/chat
 */
export const getChatHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await TemporaryTicket.findOne({ tempTicketId: id });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Temporary ticket not found",
      });
    }

    const chatHistory = ticket.exportChatHistory();

    res.status(200).json({
      success: true,
      data: {
        tempTicketId: ticket.tempTicketId,
        chatHistory,
        messageCount: chatHistory.length,
      },
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat history",
      error: error.message,
    });
  }
};

/**
 * Get temporary tickets for a specific user
 * GET /api/temporary-ticket/user/:userId
 */
export const getTemporaryTicketsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { includeResolved } = req.query;

    const query = { userId };
    
    if (includeResolved !== "true") {
      query.autoResolved = false;
      // We want to see escalated tickets so user can continue chatting
      // query.escalatedToTicket = false; 
    }

    const tickets = await TemporaryTicket.find(query)
      .sort({ lastActivityAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: tickets.map((t) => ({
        tempTicketId: t.tempTicketId,
        issueTitle: t.issueTitle,
        messageCount: t.chatHistory.length,
        autoResolved: t.autoResolved,
        escalatedToTicket: t.escalatedToTicket,
        lastActivityAt: t.lastActivityAt,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user temporary tickets:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user temporary tickets",
      error: error.message,
    });
  }
};

/**
 * Helper function to get the original issue description from chat history
 * Returns ONLY the first user message - no chat history or additional context
 */
export function generateDescriptionFromChat(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) {
    return "No issue description provided.";
  }

  // Get the first user message as the original issue description
  const firstUserMessage = chatHistory.find((msg) => msg.role === "user");
  
  // Return only the first user message - this is the original issue
  return firstUserMessage ? firstUserMessage.message : "User issue from chatbot";
}