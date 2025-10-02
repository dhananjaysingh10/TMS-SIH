import express from "express";
import { createTicket, getAllTickets, getTicketById, updateTicket, deleteTicket, getTicketsByDepartment, getTicketsByCreatedBy, getFilteredTickets, addProgressUpdate } from "../controllers/ticket.controller.js";

const router = express.Router();

router.post("/", createTicket);
router.get("/", getFilteredTickets);
router.get("/:id", getTicketById);
router.get("/department/:department", getTicketsByDepartment);
router.get("/createdBy/:userId", getTicketsByCreatedBy);
router.put("/:id", updateTicket);
router.post("/:id/progress", addProgressUpdate);
router.delete("/:id", deleteTicket);

export default router;