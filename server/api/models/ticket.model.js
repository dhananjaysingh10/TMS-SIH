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
  userId: {
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
      enum: ["IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"],
      default: "Other",
    },
    type: {
      type: String,
      enum: ["bug", "feature", "task", "improvement", "support"],
      required: true,
      default: "test"
    },
    description: { type: String, required: true, trim: true },
    title: {
      type: String,
      required: true,
      trim: true,
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
    progress: {
      type: [progressSchema], // it contain array of progress in json format {status, remark, time and date}
      default: []
    },
    chat: {
      type: [messageSchema], // it contain chats between assigned_to and created_by , it is array of message which is like {userId, content, img_url, time}
      default: []
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
    }
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
