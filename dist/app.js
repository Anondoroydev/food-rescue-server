"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// Config & Services
const db_1 = require("./config/db");
const socketService_1 = require("./services/socketService");
const logger_1 = require("./utils/logger");
const rateLimiter_1 = require("./middleware/rateLimiter");
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const foodRoutes_1 = __importDefault(require("./routes/foodRoutes"));
const requestRoutes_1 = __importDefault(require("./routes/requestRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const donationRoutes_1 = __importDefault(require("./routes/donationRoutes"));
// Background Jobs
const expiryChecker_1 = require("./jobs/expiryChecker");
const reminderSender_1 = require("./jobs/reminderSender");
// =============================================
// PART 2: CONFIGURATION
// =============================================
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = (0, socketService_1.initSocket)(server);
const PORT = process.env.PORT || 5000;
// API-only mode: front-end views and static assets removed
// Global Middlewares
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Method Override support for HTML forms (PUT/DELETE)
app.use((req, _res, next) => {
    if (req.query && req.query._method) {
        req.method = req.query._method.toUpperCase();
    }
    next();
});
// Static Folders
// Static uploads/reports remain available but frontend assets removed
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/reports', express_1.default.static(path_1.default.join(process.cwd(), 'reports')));
// Apply rate limiter to API routes
app.use('/api', rateLimiter_1.apiRateLimiter);
// =============================================
// PART 14: API ROUTES
// =============================================
app.use('/api/auth', authRoutes_1.default);
app.use('/api/foods', foodRoutes_1.default);
app.use('/api/requests', requestRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/donations', donationRoutes_1.default);
// Frontend removed: API-only server. Root provides status.
app.get('/', (_req, res) => {
    res.json({ success: true, message: 'API only mode. Frontend removed.' });
});
// =============================================
// PART 19: ERROR HANDLING
// =============================================
// 404 Handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: '404 - Not Found',
        info: 'This server is running in API-only mode. Frontend views removed.'
    });
});
// Global Error Handler
app.use((err, req, res, _next) => {
    (0, logger_1.logError)(`Unhandled Application Error: ${err.stack || err.message}`);
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
    await (0, db_1.initDB)();
    // 2. Start Background Jobs
    (0, expiryChecker_1.startExpiryCheckerJob)();
    (0, reminderSender_1.startReminderSenderJob)();
    // 3. Start Listening HTTP & Socket Server
    server.listen(PORT, () => {
        (0, logger_1.logInfo)(`🚀 Food Rescue Server running on http://localhost:${PORT}`);
    });
};
startServer();
// Graceful Shutdown
process.on('SIGTERM', () => {
    (0, logger_1.logInfo)('SIGTERM received. Shutting down server gracefully...');
    server.close(() => {
        (0, logger_1.logInfo)('Process terminated.');
    });
});
