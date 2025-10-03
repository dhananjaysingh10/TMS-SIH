import express from "express";
import {
  createTicket,
  acceptTicket,
  resolveTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketsByDepartment,
  getTicketsByCreatedBy,
  getFilteredTickets,
  addProgressUpdate,
  updateTicketStatus
} from "../controllers/ticket.controller.js";
import { authMiddleware } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/", createTicket);
router.get("/", getAllTickets);
router.get("/filter", getFilteredTickets);
router.get("/:id", getTicketById);
router.get("/department/:department", getTicketsByDepartment);
router.get("/createdBy/:userId", getTicketsByCreatedBy);
router.put("/:id", updateTicket);
router.post("/:id/progress", addProgressUpdate);
router.delete("/:id", deleteTicket);
router.post("/accept/:id", acceptTicket);
router.post("/resolve/:id", resolveTicket);

router.post("/status/:id", authMiddleware, updateTicketStatus);
export default router;
