import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Config & Services
import { initDB } from './config/db';
import { initSocket } from './services/socketService';
import { logInfo, logError } from './utils/logger';
import { authenticate } from './middleware/auth';
import { apiRateLimiter } from './middleware/rateLimiter';

// Models
import { FoodModel } from './models/Food';
import { RequestModel } from './models/Request';
import { UserModel } from './models/User';
import { NotificationModel } from './models/Notification';
import { DonationModel } from './models/Donation';
import { ChatMessageModel } from './models/ChatMessage';

// Routes
import authRoutes from './routes/authRoutes';
import foodRoutes from './routes/foodRoutes';
import requestRoutes from './routes/requestRoutes';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';
import adminRoutes from './routes/adminRoutes';
import reportRoutes from './routes/reportRoutes';
import donationRoutes from './routes/donationRoutes';

// Background Jobs
import { startExpiryCheckerJob } from './jobs/expiryChecker';
import { startReminderSenderJob } from './jobs/reminderSender';

// =============================================
// PART 2: CONFIGURATION
// =============================================
dotenv.config();

import { UPLOAD_PATH, REPORT_PATH } from './config/paths';

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

const PORT = process.env.PORT || 5000;


// API-only mode: front-end views and static assets removed
// Global Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Method Override support for HTML forms (PUT/DELETE)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.query && req.query._method) {
    req.method = (req.query._method as string).toUpperCase();
  }
  next();
});

// Static Folders
// Static uploads/reports remain available but frontend assets removed
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/reports', express.static(path.join(process.cwd(), 'reports')));

// Apply rate limiter to API routes
app.use('/api', apiRateLimiter);

// =============================================
// PART 14: API ROUTES
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/donations', donationRoutes);

// Frontend removed: API-only server. Root provides status.
app.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'API only mode. Frontend removed.' });
});

// =============================================
// PART 19: ERROR HANDLING
// =============================================
// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '404 - Not Found',
    info: 'This server is running in API-only mode. Frontend views removed.'
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logError(`Unhandled Application Error: ${err.stack || err.message}`);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// =============================================
// PART 20: SERVER STARTUP
// =============================================
const startServer = async () => {
  // 1. Initialize DB Schema & Seed Data
  await initDB();

  // 2. Start Background Jobs
  startExpiryCheckerJob();
  startReminderSenderJob();

  // 3. Start Listening HTTP & Socket Server
  server.listen(PORT, () => {
    logInfo(`🚀 Food Rescue Server running on http://localhost:${PORT}`);
  });
};

startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received. Shutting down server gracefully...');
  server.close(() => {
    logInfo('Process terminated.');
  });
});
