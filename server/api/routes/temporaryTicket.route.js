// temporaryTicket.route.js
import express from "express";
import {
  createTemporaryTicket,
  addChatMessage,
  markAutoResolved,
  escalateToTicket,
  getTemporaryTicket,
  getChatHistory,
  getTemporaryTicketsByUser,
} from "../controllers/temporaryTicket.controller.js";

const router = express.Router();

// Create a new temporary ticket
router.post("/", createTemporaryTicket);

// Get temporary tickets for a user
router.get("/user/:userId", getTemporaryTicketsByUser);

// Get a specific temporary ticket
router.get("/:id", getTemporaryTicket);

// Get chat history for a temporary ticket
router.get("/:id/chat", getChatHistory);

// Add a chat message to a temporary ticket
router.post("/:id/message", addChatMessage);

// Mark temporary ticket as auto-resolved (user satisfied)
router.post("/:id/resolve", markAutoResolved);

// Escalate temporary ticket to permanent ticket
router.post("/:id/escalate", escalateToTicket);

export default router;
