import express from "express";
import { getTicketMessages, sendMessage } from "../controllers/message.controller";
import { authMiddleware } from "../utils/verifyUser.js";
const router = express.Router();


router.get("/:ticketId/messages", authMiddleware, getTicketMessages);
router.post("/:ticketId/messages", authMiddleware, sendMessage);

export default router;