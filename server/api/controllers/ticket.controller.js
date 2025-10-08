//ticket.controller.js
import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import crypto from "crypto";
import User from "../models/user.model.js";
import { sendTicketStatusUpdateEmail } from "../services/email.service.js";

const paginateTickets = async (query, page, limit, sortOptions) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  if (pageNum < 1 || limitNum < 1) {
    throw new Error("Page and limit must be positive integers");
  }

  const [total, tickets] = await Promise.all([
    Ticket.countDocuments(query),
    Ticket.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum),
  ]);

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
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
    console.log(req.body);
    const finalTicketId = ticketId || crypto.randomUUID();
    const createdBy = await User.findOne({ email: useremail });
    console.log(createdBy);
    const assignedTo = await User.findOne({ email: assignedemail });
    console.log(assignedTo);
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
    console.log(savedTicket);
    await logProgress(newTicket._id, useremail, "Employee created ticket");
    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: savedTicket,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: "Error creating ticket",
      error: error.message,
    });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const query = {};
    let sortOptions = { createdAt: -1 };
    if (typeof search === "string" && search.trim().length > 0) {
      const terms = search.trim().split(/\s+/).filter(Boolean).slice(0, 5);
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = terms.map(escapeRegex).join("|");
      const rx = new RegExp(pattern, "i");
      query.$or = [{ title: rx }, { description: rx }, { ticketId: rx }];
    }

    const { tickets } = await paginateTickets(query, page, limit, sortOptions);
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tickets",
      error: error.message,
    });
  }
};

export const getTicketsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { page, limit } = req.query;

    const validDepartments = [
      "IT",
      "DevOps",
      "Software",
      "Networking",
      "Cybersecurity",
      "Other",
    ];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department. Must be one of: ${validDepartments.join(
          ", "
        )}`,
      });
    }

    const { tickets } = await paginateTickets({ department }, page, limit, {
      createdAt: -1,
    });
    res.status(200).json(tickets);
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

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query = { createdBy: userObjectId };

    const { tickets } = await paginateTickets(
      query,
      page,
      limit,
      { createdAt: -1 }
    );
    
    res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error("Error fetching tickets by creator:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tickets by creator",
      error: error.message,
    });
  }
};

export const getTicketById = async (req, res) => {
  try {

    const ticket = await Ticket.findOne({ticketId:req.params.id}).populate([
      {
        path: "createdBy",
        select: "name email",
      },
      {
        path: "assignedTo",
        select: "name email",
      },
    ]);
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
    const { userId: useremail } = req.body;
    const userToAssign = await User.findOne({ email: useremail });
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
    await logProgress(ticketId, useremail, "Employee accepted ticket");
    const remark = "Employee accepted ticket"
    try {
      await sendTicketStatusUpdateEmail(
        updatedTicket.createdBy.email,
        updatedTicket.ticketId,
        updatedTicket.status,
        remark,
        Date.now()
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
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

export const unacceptTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { useremail } = req.body;
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        accepted: false,
        status: "open",
        assignedTo: null,
      },
      { new: true, runValidators: true }
    ).populate("assignedTo createdBy", "name email");;

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }
    await logProgress(ticketId, useremail, "Employee unclaimed ticket");
    const remark = "Employee uncalimed ticket"
    try {
      await sendTicketStatusUpdateEmail(
        updatedTicket.createdBy.email,
        updatedTicket.ticketId,
        updatedTicket.status,
        remark,
        Date.now()
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
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

export const openTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { useremail } = req.body;
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        accepted: false,
        status: "open",
        assignedTo: null,
      },
      { new: true, runValidators: true }
    ).populate("assignedTo createdBy", "name email");;

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }
    await logProgress(ticketId, useremail, "Ticket opened again");
    const remark = "Ticket opened again"
    try {
      await sendTicketStatusUpdateEmail(
        updatedTicket.createdBy.email,
        updatedTicket.ticketId,
        updatedTicket.status,
        remark,
        Date.now()
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
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
    const { useremail } = req.body;
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
    await logProgress(ticketId, useremail, "Ticket Resolved");
    const remark = "Ticket Resolved"
    try {
      await sendTicketStatusUpdateEmail(
        updatedTicket.createdBy.email,
        updatedTicket.ticketId,
        updatedTicket.status,
        remark,
        Date.now()
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
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
    const {
      department,
      createdBy,
      priority,
      type,
      status,
      sortBy,
      limit = 10,
      page = 1,
    } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (createdBy) filter.createdBy = createdBy;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (status) filter.status = status;
    console.log(createdBy);
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

export const createMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { useremail, content, attachment } = req.body;
    const postingUser = await User.findOne({ email: useremail });

    if (!postingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    const newMessage = {
      user: postingUser._id,
      content,
      attachment,
    };

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { $push: { messages: newMessage } },
      { new: true, runValidators: true }
    ).populate({
      path: "messages.user",
      select: "name email",
    });

    if (!updatedTicket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }
    const createdMessage =
      updatedTicket.messages[updatedTicket.messages.length - 1];

    res.status(201).json({
      success: true,
      message: "Message added successfully.",
      data: createdMessage,
    });
  } catch (error) {
    console.error("Error adding message to ticket:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error.", error: error.message });
  }
};

export const getMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;

    const ticket = await Ticket.findOne({ticketId}).select("messages").populate({
      path: "messages.user",
      select: "name email profilePicture",
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }

    res.status(200).json({
      success: true,
      data: ticket.messages,
    });
  } catch (error) {
    console.error("Error fetching ticket messages:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error.", error: error.message });
  }
};

export const getTicketsByAssignedTo = async (req, res) => {
  try {
    const { email } = req.body;
    const { search, page, limit } = req.query;
    const query = {};
    let sortOptions = { createdAt: -1 };
    if (typeof search === "string" && search.trim().length > 0) {
      const terms = search.trim().split(/\s+/).filter(Boolean).slice(0, 5);
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = terms.map(escapeRegex).join("|");
      const rx = new RegExp(pattern, "i");
      query.$or = [{ title: rx }, { description: rx }, { ticketId: rx }];
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with that email not found.",
      });
    }

    const filter = {
      assignedTo: user._id,
      ...(query.$or ? { $or: query.$or } : {}),
    };
    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching assigned tickets:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching assigned tickets.",
      error: error.message,
    });
  }
};

export const getTicketsCreatedBy = async (req, res) => {
  try {
    const { email } = req.body;
    const { search } = req.query;
    const query = {};
    let sortOptions = { createdAt: -1 };
    if (typeof search === "string" && search.trim().length > 0) {
      const terms = search.trim().split(/\s+/).filter(Boolean).slice(0, 5);
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = terms.map(escapeRegex).join("|");
      const rx = new RegExp(pattern, "i");
      query.$or = [{ title: rx }, { description: rx }, { ticketId: rx }];
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with that email not found.",
      });
    }

//     const filter = {
//       assignedTo: user._id,
//       ...(query.$or ? { $or: query.$or } : {}),
//     };

    const tickets = await Ticket.find(filter)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching assigned tickets:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching assigned tickets.",
      error: error.message,
    });
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

    const ticket = await Ticket.findById(id).populate("createdBy");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const progressUpdate = {
      status,
      remark,
      createdAt: new Date(),
      createdBy: req.user.userId,
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
        progress: ticket.progress,
      },
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res
      .status(500)
      .json({ message: "Server error while updating ticket status" });
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
    res
      .status(500)
      .json({ message: "Error adding comment", error: error.message });
  }
};

export const logProgress = async (ticketId, useremail, description) => {
  try {
    const user = await User.findOne({ email: useremail });
    console.log(useremail);
    if (!user) {
      console.error(
        `Failed to log progress: User with email ${useremail} not found.`
      );
      return;
    }

    const progressEntry = {
      user: user._id,
      description: description,
    };

    await Ticket.findByIdAndUpdate(ticketId, {
      $push: {
        progress: {
          $each: [progressEntry],
          $sort: { timestamp: -1 },
        },
      },
    });
  } catch (error) {
    console.error(`Failed to log progress for ticket ${ticketId}:`, error);
  }
};

export const getActivites = async (req, res) => {
  try {
    const ticketId = req.params.id;

    const ticket = await Ticket.findOne({ticketId}).select("progress").populate({
      path: "progress.user",
      select: "name email profilePicture",
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }

    res.status(200).json({
      success: true,
      data: ticket.progress,
    });
  } catch (error) {
    console.error("Error fetching ticket progress:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error.", error: error.message });
  }
};