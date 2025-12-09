//ticket.model.js
import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: false,
    trim: true,
  },
  attachment: {
    type: String,
    required: false,
  },
  mimeType: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    displayId: { type: String, unique: true, sparse: true }, // TKT000001, TKT000002, etc.
    department: {
      type: String,
      default: null, // Legacy field, kept for migration compatibility
    },
    departmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    type: {
      type: String,
      enum: ["bug", "feature", "task", "improvement", "support"],
      required: true,
      default: "task",
    },
    description: { type: String, required: true, trim: true },
    title: {
      type: String,
      required: false,
      trim: true,
      default: "Test Title ",
      text: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    progress: [progressSchema],
    chat: {
      type: [messageSchema], // it contain chats between assigned_to and created_by , it is array of message which is like {userId, content, img_url, time}
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    rating: {
      type: Number,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
      default: 0,
    },
    dueDate: {
      type: Date,
      required: false,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    messages: [messageSchema],
    inreview: {
      type: Boolean,
      default: false,
    },
    autoResolve: {
      type: Boolean,
      default: false,
    },
    escalationThresholdHours: {
      type: Number,
      default: null, // Will be set based on priority: low=2, medium=1, high=0.5, urgent=0.5
    },
    escalatedAt: {
      type: Date,
      default: null, // Last escalation time
    },
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
