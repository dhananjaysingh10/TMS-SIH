import express from "express";
import { getTicketMessages, sendMessage } from "../controllers/message.controller.js";
import { authMiddleware } from "../utils/verifyUser.js";
import { handleUpload } from "../utils/upload.js";

const router = express.Router();

router.get("/:ticketId/messages", authMiddleware, getTicketMessages);
router.post("/:ticketId/messages", authMiddleware, handleUpload, sendMessage);
router.post("/:ticketId/messagesAI", handleUpload, sendMessage);

export default router;
