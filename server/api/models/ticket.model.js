import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["open", "in-progress", "resolved", "closed"],
    required: true,
  },
  remark: {
    type: String,
    required: false,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
    required: true,
    trim: true,
  },
  attachment: {
    type: String,
    required:false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});



const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    department: {
      type: String,
      enum: [
        "IT",
        "DevOps",
        "Software",
        "Networking",
        "Cybersecurity",
        "Other",
      ],
      default: "Other",
    },
    type: { type: String, default: "test" },
    description: { type: String, required: true },
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
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
