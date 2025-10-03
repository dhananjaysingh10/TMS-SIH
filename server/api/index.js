import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import {Server} from 'socket.io';
import connectDB from './config/connectDB.js';

import authRoutes from './routes/auth.route.js';
import userRoutes from "./routes/user.route.js";
import ticketRoute from "./routes/ticket.route.js"
import Ticket from './models/ticket.model.js';

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
		limit: '10mb', 
	})
);
app.use(cookieParser());

app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 10000;

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ticket', ticketRoute);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // join room
  socket.on('joinTicket', (ticketId) => {
    socket.join(ticketId);
    console.log(`User ${socket.id} joined ticket ${ticketId}`);
  });

  // rts
  socket.on('sendMessage', async ({ ticketId, content, attachments, userId }) => {
    try {
      const ticket = await Ticket.findOne({ ticketId });
      if (!ticket) {
        socket.emit('error', { message: 'Ticket not found' });
        return;
      }

      const message = {
        userId,
        content,
        attachments: attachments || [],
        createdAt: new Date(),
      };

      ticket.chat.push(message);
      await ticket.save();

      // brodcast
      io.to(ticketId).emit('newMessage', {
        ticketId,
        message: { ...message, userId: { _id: userId, username: 'User' } }, 
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use((err, req, res, next) => {
	console.error('Server error:', err);
	res.status(err.status || 500).json({
		error:
			process.env.NODE_ENV === 'production'
				? 'Internal server error'
				: err.message,
	});
});

app.use((req, res) => {
	res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});