import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import crypto from "crypto";

const paginateTickets = async (query, page, limit, res) => {
  try {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
    }

    const skip = (pageNum - 1) * limitNum;
    const total = await Ticket.countDocuments(query);
    const tickets = await Ticket.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limitNum);

    return {
      success: true,
      count: tickets.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: tickets,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching tickets",
      error: error.message,
    };
  }
};

export const createTicket = async (req, res) => {
  try {
    const { ticketId, department, type, description, createdBy, assignedTo, status } = req.body;

    const finalTicketId = ticketId || crypto.randomUUID();

    const newTicket = new Ticket({
      ticketId: finalTicketId,
      department,
      type,
      description,
      createdBy,
      assignedTo,
      status,
    });

    const savedTicket = await newTicket.save();

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: savedTicket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating ticket",
      error: error.message,
    });
  }
};

export const getAllTickets = async (req, res) => {
  const { page, limit } = req.query;
  const result = await paginateTickets({}, page, limit, res);

  res.status(result.success ? 200 : 500).json(result);
};

export const getTicketsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { page, limit } = req.query;

    const validDepartments = ["IT", "dev-ops", "software", "networking", "cyber-security", "NA"];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department. Must be one of: ${validDepartments.join(", ")}`,
      });
    }

    const result = await paginateTickets({ department }, page, limit, res);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tickets by department",
      error: error.message,
    });
  }
};

export const getTicketsByCreatedBy = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const result = await paginateTickets({ createdBy: userId }, page, limit, res);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tickets by creator",
      error: error.message,
    });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate("assignedTo", "name email").populate("createdBy", "name email");
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }
    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching ticket",
      error: error.message,
    });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { department, type, description, assignedTo, status } = req.body;

    const updateData = {
      department,
      type,
      description,
      assignedTo,
      status,
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name email").populate("createdBy", "name email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating ticket",
      error: error.message,
    });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting ticket",
      error: error.message,
    });
  }
};