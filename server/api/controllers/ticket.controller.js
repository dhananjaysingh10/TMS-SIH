//ticket.controller.js
import crypto from "crypto";
import mongoose from "mongoose";
import { createClient } from "redis";
import Department from "../models/department.model.js";
import Ticket from "../models/ticket.model.js";
import User from "../models/user.model.js";
import { sendTicketStatusUpdateEmail } from "../services/email.service.js";

const TICKET_QUEUE_NAME = "tickets_queue";
const FEEDBACK_QUEUE_NAME = "feedback_queue";

const getRedisClient = async () => {
  const client = createClient({
    url: process.env.REDIS_URL
  });
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();
  return client;
};

const sendFeedbackToQueue = async (ticket, action, oldDept, newDept) => {
  try {
    const client = await getRedisClient();
    const feedback = {
      ticket_id: ticket.ticketId,
      text: ticket.description + " " + ticket.title,
      action: action, // "correction" or "confirmation"
      old_department: oldDept,
      new_department: newDept,
      timestamp: new Date().toISOString()
    };
    await client.lPush(FEEDBACK_QUEUE_NAME, JSON.stringify(feedback));
    await client.disconnect();
    console.log(`Feedback sent for ticket ${ticket.ticketId}: ${action}`);
  } catch (error) {
    console.error("Error sending feedback to Redis:", error);
  }
};


const paginateTickets = async (query, page, limit, sortOptions) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 100;
  const skip = (pageNum - 1) * limitNum;
  if (pageNum < 1 || limitNum < 1) {
    throw new Error("Page and limit must be positive integers");
  }

  const [total, tickets] = await Promise.all([
    Ticket.countDocuments(query),
    Ticket.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate({
        path: "departmentRef",
        select: "name product",
        populate: {
          path: "product",
          select: "name"
        }
      })
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

export const getDepartments = async (req, res) => {
  try {
    // Get departments from dynamic Department collection
    const departments = await Department.find({ isActive: true })
      .populate('product', 'name')
      .select('_id name product');

    // Also include legacy enum values for backward compatibility
    const legacyDepartments = Ticket.schema.path("department").enumValues || [];

    res.status(200).json({
      success: true,
      departments: departments, // New dynamic departments
      legacyDepartments: legacyDepartments, // Old enum values
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

export const createTicket = async (req, res) => {
  try {
    const {
      ticketId,
      department,
      departmentId, // New: accept department ID directly
      productName,  // NEW: Product name from classification
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

    // Resolve departmentRef from departmentId or department name
    let departmentRef = null;
    let departmentName = department;

    if (departmentId) {
      // If departmentId is provided, use it directly
      const dept = await Department.findById(departmentId);
      if (dept) {
        departmentRef = dept._id;
        departmentName = dept.name;
      }
    } else if (department) {
      //now it accepts the department name and product name
      let productRef = null;
      if (productName) {
        const Product = (await import('../models/product.model.js')).default;
        const prod = await Product.findOne({ name: productName, isActive: true });
        if (prod) {
          productRef = prod._id;
          console.log(`Found product: ${productName} -> ${productRef}`);
        }
      }

      // Find department with product context
      const query = { name: department, isActive: true };
      if (productRef) {
        query.product = productRef;  // Narrow search to specific product
      }
      const dept = await Department.findOne(query);
      if (dept) {
        departmentRef = dept._id;
        console.log(`Found department: ${department} -> ${departmentRef}`);
      }
    }

    const newTicket = new Ticket({
      ticketId: finalTicketId,
      department: departmentName,
      departmentRef,
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
    const remark = "Your ticket created Succesafuly";
    await logProgress(newTicket._id, useremail, "Employee created ticket");
    try {
      await sendTicketStatusUpdateEmail(
        savedTicket.createdBy.email,
        savedTicket.ticketId,
        savedTicket.status,
        remark,
        Date.now()
      );
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }
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


export const createTicketFrontend = async (req, res) => {
  try {
    const { title, description, useremail } = req.body;
    if (!title || !description || !useremail) {
      return res.status(400).json({
        error:
          "Bad Request. Missing required fields: sender, subject, and body are all required.",
      });
    }
    const ticket = {
      ticketId: crypto.randomUUID(),
      title,
      description,
      priority: "medium",
      department: "IT",
      type: "task",
      status: "open",
      createdBy: useremail,
    };
    const redisClient = createClient();
    redisClient.connect();
    await redisClient.lPush(TICKET_QUEUE_NAME, JSON.stringify(ticket));
    await redisClient.disconnect();
    return res.status(201).json({
      success: true,
      message: "Ticket submitted successfully.",
      ticket_id: ticket.ticketId,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to queue ticket", error: err.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const { search, page, limit, productId, assignedTo, includeInReview } = req.query;
    const query = {};
    let sortOptions = { createdAt: -1 };

    // Exclude tickets pending department change (inreview: true) unless explicitly requested
    if (includeInReview !== 'true') {
      query.inreview = { $ne: true };
    }

    // Filter by productId - visibility rules:
    // - Super-admin: see all tickets
    // - Admin of THIS product: see all tickets in this product
    // - Admin of OTHER products / Employee / User: only see tickets from their departments
    if (productId) {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      // Get all departments under this product
      const allDepartmentsInProduct = await Department.find({ product: productId }).select('_id');
      let departmentIds = allDepartmentsInProduct.map(d => d._id);

      // Check if user is admin of THIS specific product (not just has admin role)
      let isAdminOfThisProduct = false;
      if (userRole === 'super-admin') {
        isAdminOfThisProduct = true; // super-admin can see everything
      } else if (userRole === 'admin' && userId) {
        const Product = (await import('../models/product.model.js')).default;
        const product = await Product.findById(productId).select('admin');
        isAdminOfThisProduct = product?.admin?.toString() === userId;
        console.log(`getAllTickets: User ${userId} is admin of product ${productId}? ${isAdminOfThisProduct}`);
      }

      // If NOT admin of this product, filter to only user's departments
      if (!isAdminOfThisProduct && userId) {
        const user = await User.findById(userId).select('departments');
        if (user && user.departments) {
          // Intersect user's departments with product's departments
          const userDeptIds = user.departments.map(d => d.toString());
          departmentIds = departmentIds.filter(d => userDeptIds.includes(d.toString()));
          console.log(`getAllTickets: User ${userId} filtered to ${departmentIds.length} departments in product ${productId}`);
        }
      }

      query.departmentRef = { $in: departmentIds };
    }

    // Filter by assignedTo email - look up user first
    if (assignedTo) {
      const assignedUser = await User.findOne({ email: assignedTo }).select('_id');
      if (assignedUser) {
        query.assignedTo = assignedUser._id;
      } else {
        // No user found with this email, return empty
        return res.status(200).json([]);
      }
    }

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
    const { search, page, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query = { createdBy: userObjectId };
    let sortOptions = { createdAt: -1 };

    // Add search functionality similar to getAllTickets
    if (typeof search === "string" && search.trim().length > 0) {
      const terms = search.trim().split(/\s+/).filter(Boolean).slice(0, 5);
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = terms.map(escapeRegex).join("|");
      const rx = new RegExp(pattern, "i");
      query.$or = [{ title: rx }, { description: rx }, { ticketId: rx }];
    }

    const { tickets } = await paginateTickets(query, page, limit, sortOptions);

    res.status(200).json({
      success: true,
      data: tickets,
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
    const ticket = await Ticket.findOne({ ticketId: req.params.id }).populate([
      {
        path: "createdBy",
        select: "name email",
      },
      {
        path: "assignedTo",
        select: "name email",
      },
      {
        path: "departmentRef",
        select: "name product",
        populate: {
          path: "product",
          select: "name"
        }
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
    const { department, departmentId, type, description, assignedTo, status } = req.body;

    const updateData = {
      type,
      description,
      assignedTo,
      status,
    };

    // Handle department update with new system
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (dept) {
        updateData.department = dept.name;
        updateData.departmentRef = dept._id;
      }
    } else if (department) {
      updateData.department = department;
      // Try to find and set departmentRef
      const dept = await Department.findOne({ name: department, isActive: true });
      if (dept) {
        updateData.departmentRef = dept._id;
      }
    }

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check for department change (Feedback Loop)
    const newDeptName = updateData.department || ticket.department;
    if (updateData.department && ticket.department !== updateData.department) {
      console.log(`Department change detected: ${ticket.department} -> ${updateData.department}`);
      // Send negative reinforcement (correction)
      await sendFeedbackToQueue(ticket, "correction", ticket.department, updateData.department);
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
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
    const remark = "Employee accepted ticket";
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
    ).populate("assignedTo createdBy", "name email");

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    await logProgress(ticketId, useremail, "Employee unclaimed ticket");
    const remark = "Employee uncalimed ticket";
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
    const { useremail, remark } = req.body;
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        accepted: false,
        status: "open",
        assignedTo: null,
      },
      { new: true, runValidators: true }
    ).populate("assignedTo createdBy", "name email");

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }
    await logProgress(ticketId, useremail, "Ticket opened again");
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
    const { useremail, remark } = req.body;
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

export const requestTicket = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { useremail, remark } = req.body;
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        inreview: true,
      },
      { new: true, runValidators: true }
    ).populate("assignedTo createdBy", "name email");

    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }
    await logProgress(ticketId, useremail, "Department Change Request Initiated");
    res.status(200).json({
      success: true,
      message: "Department Change request initiated successfully.",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({
      success: false,
      message: "Server error while requesting change.",
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

    const ticket = await Ticket.findOne({ ticketId })
      .select("messages")
      .populate({
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

    const ticket = await Ticket.findOne({ ticketId })
      .select("progress")
      .populate({
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

// Get tickets pending department change (inreview: true) for admin's products
export const getTicketsInReview = async (req, res) => {
  try {
    // Log full user object to see what properties exist
    console.log(`getTicketsInReview: Full req.user object:`, JSON.stringify(req.user));

    // JWT stores userId as 'userId' property (same as getMyProducts)
    const userId = req.user?.userId;
    const userRole = req.user.role;

    console.log(`getTicketsInReview: userId=${userId}, role=${userRole}`);

    // Build query for tickets in review
    let query = { inreview: true };

    // If not super-admin, filter to products this admin manages
    if (userRole !== 'super-admin') {
      const Product = (await import('../models/product.model.js')).default;

      // Log ALL products and their admins for debugging
      const allProducts = await Product.find({}).select('_id name admin');
      console.log(`getTicketsInReview: ALL PRODUCTS:`, allProducts.map(p => ({ name: p.name, admin: p.admin?.toString() })));

      // Convert userId to ObjectId for proper comparison
      let userObjectId;
      try {
        userObjectId = new mongoose.Types.ObjectId(userId);
      } catch (e) {
        console.log(`getTicketsInReview: Invalid userId format: ${userId}`);
        return res.status(200).json({ success: true, tickets: [] });
      }

      // Get products where this user is the admin (product-level admin, not just role)
      const managedProducts = await Product.find({ admin: userObjectId }).select('_id name');
      const productIds = managedProducts.map(p => p._id);

      console.log(`getTicketsInReview: Admin ${userId} is product-admin of:`, managedProducts.map(p => ({ _id: p._id.toString(), name: p.name })));

      // If admin manages no products as product-admin, return empty list
      if (productIds.length === 0) {
        console.log(`getTicketsInReview: No products managed, returning empty list`);
        return res.status(200).json({
          success: true,
          tickets: [],
        });
      }

      // Get departments under these products
      const departments = await Department.find({ product: { $in: productIds } }).select('_id name');
      const departmentIds = departments.map(d => d._id);

      console.log(`getTicketsInReview: Departments in managed products:`, departments.map(d => ({ _id: d._id, name: d.name })));

      query.departmentRef = { $in: departmentIds };
    }

    console.log(`getTicketsInReview: Final query:`, JSON.stringify(query));

    const tickets = await Ticket.find(query)
      .populate('createdBy', 'name email profilePicture')
      .populate('assignedTo', 'name email profilePicture')
      .populate('departmentRef', 'name product')
      .sort({ createdAt: -1 });

    console.log(`getTicketsInReview: Found ${tickets.length} tickets`);

    // Populate product info for each ticket
    const Product = (await import('../models/product.model.js')).default;
    const ticketsWithProduct = await Promise.all(tickets.map(async (ticket) => {
      const ticketObj = ticket.toObject();
      if (ticketObj.departmentRef?.product) {
        const product = await Product.findById(ticketObj.departmentRef.product).select('name');
        ticketObj.product = product;
      }
      return ticketObj;
    }));

    res.status(200).json({
      success: true,
      tickets: ticketsWithProduct,
    });
  } catch (error) {
    console.error("Error fetching tickets in review:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tickets in review",
      error: error.message,
    });
  }
};

// Approve department change - reassign department and clear inreview flag
export const approveDepartmentChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user.role;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "departmentId is required",
      });
    }

    // Find the ticket
    const ticket = await Ticket.findOne({ ticketId: id });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Verify the new department exists
    const newDepartment = await Department.findById(departmentId).populate('product');
    if (!newDepartment) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // If not super-admin, verify user is admin of the product
    if (userRole !== 'super-admin') {
      const Product = (await import('../models/product.model.js')).default;
      const product = await Product.findById(newDepartment.product._id);
      if (!product || product.admin?.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only reassign tickets to departments in products you manage",
        });
      }
    }

    // Update ticket
    ticket.departmentRef = departmentId;
    ticket.department = newDepartment.name;
    ticket.inreview = false;
    ticket.assignedTo = null; // Unassign since department changed
    ticket.accepted = false;
    ticket.status = 'open';

    // Add progress entry
    ticket.progress.push({
      user: userId,
      description: `Department changed to ${newDepartment.name}`,
    });

    await ticket.save();

    res.status(200).json({
      success: true,
      message: "Department changed successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error approving department change:", error);
    res.status(500).json({
      success: false,
      message: "Error approving department change",
      error: error.message,
    });
  }
};