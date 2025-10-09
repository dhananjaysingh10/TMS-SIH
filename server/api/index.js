//index.js
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/connectDB.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from "./routes/user.route.js";
import ticketRoute from "./routes/ticket.route.js";
import messageRoute from "./routes/message.route.js"; // Import message routes
import statsRoute from "./routes/stats.route.js";
import Ticket from './models/ticket.model.js';
import User from './models/user.model.js';

dotenv.config();
connectDB();

const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:10000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(
  express.json({
    limit: '50mb',
  })
);
app.use(cookieParser());

// Attach Socket.IO instance to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 10000;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ticket', ticketRoute);
app.use('/api/messages', messageRoute); // Add message routes
app.use('/api/stats', statsRoute);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join ticket room
  socket.on('joinTicket', (ticketId) => {
    socket.join(ticketId);
    console.log(`User ${socket.id} joined ticket ${ticketId}`);
  });

  // Handle real-time message sending
socket.on('sendMessage', async ({ ticketId, content, attachment, userId }) => {
  try {
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      socket.emit('error', { message: 'Ticket not found' });
      return;
    }

    const message = {
      user: userId,
      content,
      attachment: attachment || "",
      createdAt: new Date(),
    };

    ticket.chat.push(message);
    await ticket.save();

    const savedTicket = await Ticket.findOne({ ticketId })
      .select('chat')
      .populate('chat.user', 'name email profilePicture');  // Remove username
    
    const savedMessage = savedTicket.chat[savedTicket.chat.length - 1];

    io.to(ticketId).emit('newMessage', {
      ticketId,
      message: savedMessage,
    });

  } catch (error) {
    console.error('Error sending message:', error);
    socket.emit('error', { message: error.message });
  }
});

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Use server.listen instead of app.listen for Socket.IO
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});