import express from "express";
import { createTicket, getAllTickets, getTicketById, updateTicket, deleteTicket, getTicketsByDepartment, getTicketsByCreatedBy } from "../controllers/ticket.controller.js";

const router = express.Router();

router.post("/", createTicket);
router.get("/", getAllTickets);
router.get("/department/:department", getTicketsByDepartment);
router.get("/createdBy/:userId", getTicketsByCreatedBy);
router.get("/:id", getTicketById);
router.put("/:id", updateTicket);
router.delete("/:id", deleteTicket);

export default router;