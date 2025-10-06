//message.route.js
import express from "express";
import { getTicketMessages, sendMessage } from "../controllers/message.controller.js";
import { authMiddleware } from "../utils/verifyUser.js";
const router = express.Router();


router.get("/:ticketId/messages", authMiddleware, getTicketMessages);
router.post("/:ticketId/messages", authMiddleware, sendMessage);

export default router;