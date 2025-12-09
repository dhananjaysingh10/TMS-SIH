// temporaryTicket.model.js
import mongoose from "mongoose";

/**
 * Schema for individual chat messages in the conversation
 */
const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "ai"],
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Temporary Ticket Schema
 * 
 * Used to track chatbot conversations before deciding whether to create
 * a permanent ticket. If user is satisfied (autoResolved=true), no permanent
 * ticket is created. If escalated, a permanent ticket is created and fed
 * into the classifier pipeline.
 */
const temporaryTicketSchema = new mongoose.Schema(
  {
    // Unique identifier for the temporary ticket
    tempTicketId: {
      type: String,
      required: true,
      unique: true,
    },

    // User information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
    },



    // Chat history - array of messages between user and AI
    chatHistory: {
      type: [chatMessageSchema],
      default: [],
    },

    // Resolution status
    autoResolved: {
      type: Boolean,
      default: false,
    },
    escalatedToTicket: {
      type: Boolean,
      default: false,
    },
    permanentTicketId: {
      type: String,
      default: null,
    },

    // Context for potential escalation
    issueContext: {
      type: String,
      default: "",
      trim: true,
    },
    issueTitle: {
      type: String,
      default: "",
      trim: true,
    },

    // Tracking timestamps
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient cleanup queries (find stale tickets)
temporaryTicketSchema.index({ lastActivityAt: 1, autoResolved: 1, escalatedToTicket: 1 });

// Index for user lookup
temporaryTicketSchema.index({ userId: 1 });

// Pre-save hook to update lastActivityAt
temporaryTicketSchema.pre("save", function (next) {
  if (this.isModified("chatHistory")) {
    this.lastActivityAt = new Date();
  }
  next();
});

/**
 * Export chat history in a simple array format
 * @returns {Array} Array of {role, message} objects
 */
temporaryTicketSchema.methods.exportChatHistory = function () {
  return this.chatHistory.map((msg) => ({
    role: msg.role,
    message: msg.message,
    timestamp: msg.timestamp,
  }));
};

/**
 * Check if this temporary ticket is stale (no activity for given days)
 * @param {number} days - Number of days threshold (default: 7)
 * @returns {boolean}
 */
temporaryTicketSchema.methods.isStale = function (days = 7) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);
  return this.lastActivityAt < thresholdDate;
};

/**
 * Static method to find all stale temporary tickets
 * @param {number} days - Number of days threshold (default: 7)
 * @returns {Promise<Array>}
 */
temporaryTicketSchema.statics.findStaleTickets = function (days = 7) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);
  
  return this.find({
    lastActivityAt: { $lt: thresholdDate },
    autoResolved: false,
    escalatedToTicket: false,
  });
};

const TemporaryTicket = mongoose.model("TemporaryTicket", temporaryTicketSchema);
export default TemporaryTicket;
