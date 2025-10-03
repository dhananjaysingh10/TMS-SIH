import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import crypto from "crypto";
import User from "../models/user.model.js";
import { sendTicketStatusUpdateEmail } from "../services/email.service.js";

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
    
    const {
      ticketId,
      department,
      type,
      description,
      useremail,
      assignedemail,
      status,
      priority,
      title,
    } = req.body;
    
    const finalTicketId = ticketId || crypto.randomUUID();
    const createdBy = await User.findOne({ email: useremail });
    const assignedTo = await User.findOne({ email: assignedemail });
    
    const newTicket = new Ticket({
      ticketId: finalTicketId,
      department,
      type,
      description,
      createdBy,
      assignedTo,
      status,
      priority,
      title,
    });
    
    const savedTicket = await newTicket.save();
    console.log("enter");
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

  res.status(result.success ? 200 : 500).json(result.data);
};

export const getTicketsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { page, limit } = req.query;

    const validDepartments = [
      "IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"
    ];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department. Must be one of: ${validDepartments.join(
          ", "
        )}`,
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

    const result = await paginateTickets(
      { createdBy: userId },
      page,
      limit,
      res
    );
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
    const ticket = await Ticket.findById(req.params.id)
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
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

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

export const acceptTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params; 
    const { userId: userEmail } = req.body; 
    const userToAssign = await User.findOne({ email: userEmail });
    if (!userToAssign) {
      return res.status(404).json({
        success: false,
        message: "User to assign not found.",
      });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        assignedTo: userToAssign._id, 
        accepted: true,
        status: "in-progress",
      },
      { new: true, runValidators: true }
    ).populate("assignedTo createdBy", "name email");

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket accepted and assigned successfully.",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error accepting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Server error while accepting ticket.",
      error: error.message,
    });
  }
};

export const resolveTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        status: "resolved",
      },
      { new: true, runValidators: true }
    ).populate("assignedTo createdBy", "name email");

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket resolved successfully.",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resolving ticket.",
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

export const getFilteredTickets = async (req, res) => {
  try {
    const { department, createdBy, priority, type, status, sortBy, limit = 10, page = 1 } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (createdBy) filter.createdBy = createdBy;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sort = {};
    if (sortBy) {
      const [field, order] = sortBy.split(":");
      sort[field] = order === "desc" ? -1 : 1;
    } else {
      sort.createdAt = -1; 
    }

    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ticket.countDocuments(filter);

    res.status(200).json({
      tickets,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addProgressUpdate = async (req, res) => {
  try {
    const { status, remark, createdBy } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.progress.push({ status, remark, createdBy });
    await ticket.save();
    res.status(200).json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;
    
    const validStatuses = ["open", "in-progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const ticket = await Ticket.findById(id).populate('createdBy');
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const progressUpdate = {
      status,
      remark,
      createdAt: new Date(),
      createdBy: req.user.userId 
    };

    ticket.status = status;
    ticket.progress.push(progressUpdate);
    await ticket.save();

    try {
      await sendTicketStatusUpdateEmail(
        ticket.createdBy.email,
        ticket.ticketId,
        status,
        remark,
        progressUpdate.createdAt
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }

    res.status(200).json({
      message: "Ticket status updated successfully",
      ticket: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        progress: ticket.progress
      }
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({ message: "Server error while updating ticket status" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    ticket.comments.push({
      content,
      by: userId,
      createdAt: new Date(),
    });

    await ticket.save();

    res.status(200).json({ message: "Comment added successfully", ticket });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment", error: error.message });
  }
};