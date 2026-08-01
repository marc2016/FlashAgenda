import http from 'http';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import app from './app';
import { initSocketService } from './services/socketService';

dotenv.config();

const PORT: number = parseInt(process.env.PORT || '3001', 10);

// Rate Limiting (Max 10000 requests per 15 minutes per IP, excluding GET and /ping)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { message: 'Zu viele Anfragen von dieser IP, bitte versuche es später erneut.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.originalUrl.includes('/ping') || req.url.includes('/ping')
});
app.use('/api', limiter);

// HTTP Server for Express & Socket.io
const server = http.createServer(app);
initSocketService(server);

// MongoDB connection
const mongoUri: string = process.env.MONGO_URI || 'mongodb://localhost:27017/flashagenda';

mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err: Error) => console.error('Failed to connect to MongoDB', err));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with WebSockets enabled`);
});
