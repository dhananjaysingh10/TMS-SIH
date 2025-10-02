import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/connectDB.js';

import authRoutes from './routes/auth.route.js';

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
app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(
	express.json({
		limit: '10mb', 
	})
);
app.use(cookieParser());

const PORT = process.env.PORT || 10000;

app.use('/api/auth', authRoutes);

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