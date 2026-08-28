"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.getChatHistory = void 0;
const ChatMessage_1 = require("../models/ChatMessage");
const socketService_1 = require("../services/socketService");
const getChatHistory = async (req, res) => {
    try {
        const otherUserId = parseInt(req.params.userId, 10);
        const messages = await ChatMessage_1.ChatMessageModel.getConversation(req.user.id, otherUserId);
        await ChatMessage_1.ChatMessageModel.markAsRead(otherUserId, req.user.id);
        res.status(200).json({ success: true, count: messages.length, messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving chat history' });
    }
};
exports.getChatHistory = getChatHistory;
const sendMessage = async (req, res) => {
    try {
        const { receiver_id, message } = req.body;
        const chatMsg = await ChatMessage_1.ChatMessageModel.create({
            sender_id: req.user.id,
            receiver_id: parseInt(receiver_id, 10),
            message
        });
        try {
            const io = (0, socketService_1.getIO)();
            io.to(`user_${receiver_id}`).emit('new_message', chatMsg);
        }
        catch (e) {
            // Socket optional fallback
        }
        res.status(201).json({ success: true, message: chatMsg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
};
exports.sendMessage = sendMessage;
