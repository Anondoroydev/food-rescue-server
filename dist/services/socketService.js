"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    });
    io.on('connection', (socket) => {
        (0, logger_1.logInfo)(`Socket client connected: ${socket.id}`);
        // Join rooms based on user role and id
        socket.on('join-room', (data) => {
            if (data.userId) {
                socket.join(`user_${data.userId}`);
                (0, logger_1.logInfo)(`Socket ${socket.id} joined user_${data.userId}`);
                if (data.role) {
                    socket.join(`${data.role}_${data.userId}`);
                    socket.join(data.role); // e.g. join 'ngo', 'restaurant', or 'admin'
                }
            }
        });
        socket.on('disconnect', () => {
            (0, logger_1.logInfo)(`Socket client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized!');
    }
    return io;
};
exports.getIO = getIO;
