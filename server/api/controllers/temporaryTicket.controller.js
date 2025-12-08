// temporaryTicket.controller.js
import crypto from "crypto";
import { createClient } from "redis";
import TemporaryTicket from "../models/temporaryTicket.model.js";
import User from "../models/user.model.js";

const TEMP_TICKET_ESCALATE_QUEUE = "temp_ticket_escalate_queue";

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
    const { userId, userEmail } = req.body;

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

    if (!["user", "ai"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "role must be 'user' or 'ai'",
      });
    }

    const updatedTicket = await TemporaryTicket.findOneAndUpdate(
      { tempTicketId: id },
      {
        $push: {
          chatHistory: {
            role,
            message,
            timestamp: new Date(),
          },
        },
        $set: { lastActivityAt: new Date() },
      },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Temporary ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Chat message added successfully",
      data: {
        tempTicketId: updatedTicket.tempTicketId,
        messageCount: updatedTicket.chatHistory.length,
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

    const updatedTicket = await TemporaryTicket.findOneAndUpdate(
      { tempTicketId: id },
      {
        $set: {
          autoResolved: true,
          resolvedAt: new Date(),
          lastActivityAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Temporary ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Temporary ticket marked as auto-resolved",
      data: {
        tempTicketId: updatedTicket.tempTicketId,
        autoResolved: updatedTicket.autoResolved,
        resolvedAt: updatedTicket.resolvedAt,
      },
    });
  } catch (error) {
    console.error("Error marking ticket as resolved:", error);
    res.status(500).json({
      success: false,
      message: "Error marking ticket as resolved",
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

    if (tempTicket.escalatedToTicket) {
      return res.status(400).json({
        success: false,
        message: "This ticket has already been escalated",
        permanentTicketId: tempTicket.permanentTicketId,
      });
    }

    if (tempTicket.autoResolved) {
      return res.status(400).json({
        success: false,
        message: "Cannot escalate an auto-resolved ticket",
      });
    }

    // Export chat history for the permanent ticket
    const chatHistory = tempTicket.exportChatHistory();

    // Prepare escalation payload
    const escalationPayload = {
      tempTicketId: tempTicket.tempTicketId,
      userId: tempTicket.userId.toString(),
      userEmail: tempTicket.userEmail,
      issueTitle: issueTitle || "Issue from Chatbot",
      issueDescription: issueDescription || generateDescriptionFromChat(chatHistory),
      chatHistory: chatHistory,
      createdAt: new Date().toISOString(),
    };

    // Push to Redis queue for worker processing
    const redisClient = await getRedisClient();
    await redisClient.lPush(
      TEMP_TICKET_ESCALATE_QUEUE,
      JSON.stringify(escalationPayload)
    );
    await redisClient.disconnect();

    // Mark as escalated (worker will update with permanent ticket ID)
    await TemporaryTicket.findOneAndUpdate(
      { tempTicketId: id },
      {
        $set: {
          escalatedToTicket: true,
          issueContext: issueDescription || "",
          issueTitle: issueTitle || "",
          lastActivityAt: new Date(),
        },
      }
    );

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
      query.escalatedToTicket = false;
    }

    const tickets = await TemporaryTicket.find(query)
      .sort({ lastActivityAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: tickets.map((t) => ({
        tempTicketId: t.tempTicketId,
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
 * Helper function to generate a description from chat history
 */
function generateDescriptionFromChat(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) {
    return "No conversation history available.";
  }

  // Get the first user message as the main issue
  const firstUserMessage = chatHistory.find((msg) => msg.role === "user");
  const mainIssue = firstUserMessage
    ? firstUserMessage.message
    : "User issue from chatbot";

  // Build a summary of the conversation
  const userMessages = chatHistory
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.message)
    .slice(0, 5); // Limit to first 5 user messages

  const summary = `User reported: "${mainIssue}"`;
  
  if (userMessages.length > 1) {
    return `${summary}\n\nAdditional context from conversation:\n- ${userMessages.slice(1).join("\n- ")}`;
  }

  return summary;
}
