import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import routes from './routes/index.js';
import { setupSocket } from './config/socket.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Setup socket handlers
setupSocket(io);

// Make io available to routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api', routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     🍽️  OSHXONA POS API SERVER                ║
  ╠═══════════════════════════════════════════════╣
  ║  🚀 Server:     http://localhost:${PORT}          ║
  ║  📡 Socket.IO:  Connected                      ║
  ║  🌍 Environment: ${process.env.NODE_ENV || 'development'}                 ║
  ╚═══════════════════════════════════════════════╝
  `);
});

export { io };
