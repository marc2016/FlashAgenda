import express, { Express } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import agendaRoutes from './routes/agenda';

dotenv.config();

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
// Use process.env.MONGO_URI, or fall back to localhost (for standard dev)
const mongoUri: string = process.env.MONGO_URI || 'mongodb://localhost:27017/flashagenda';

mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err: Error) => console.error('Failed to connect to MongoDB', err));

// Routes
app.use('/api/agendas', agendaRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
