"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQRCode = exports.collectFood = exports.rejectRequest = exports.approveRequest = exports.getMyRequests = exports.createRequest = void 0;
const Request_1 = require("../models/Request");
const Food_1 = require("../models/Food");
const Donation_1 = require("../models/Donation");
const notificationService_1 = require("../services/notificationService");
const qrService_1 = require("../services/qrService");
const QRCode_1 = require("../models/QRCode");
const createRequest = async (req, res) => {
    try {
        const { food_id, request_message, collection_time, collection_date } = req.body;
        const food = await Food_1.FoodModel.findById(parseInt(food_id, 10));
        if (!food) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        if (food.status !== 'available') {
            return res.status(400).json({ success: false, message: 'Food item is no longer available' });
        }
        const foodReq = await Request_1.RequestModel.create({
            food_id: food.id,
            ngo_id: req.user.id,
            request_message,
            collection_time,
            collection_date
        });
        // Notify Restaurant
        await (0, notificationService_1.createNotification)(food.restaurant_id, '📩 New Food Claim Request!', `An NGO has requested to claim your surplus food "${food.food_name}".`, 'request_received', req.user.id, foodReq.id, 'request');
        res.status(201).json({ success: true, message: 'Request submitted successfully', request: foodReq });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting food request' });
    }
};
exports.createRequest = createRequest;
const getMyRequests = async (req, res) => {
    try {
        const requests = await Request_1.RequestModel.findByNGO(req.user.id);
        res.status(200).json({ success: true, count: requests.length, requests });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching requests' });
    }
};
exports.getMyRequests = getMyRequests;
const approveRequest = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const foodReq = await Request_1.RequestModel.findById(id);
        if (!foodReq) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (foodReq.restaurant_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to approve this request' });
        }
        const updatedReq = await Request_1.RequestModel.approve(id);
        await Food_1.FoodModel.update(foodReq.food_id, { status: 'requested' });
        // Notify NGO
        await (0, notificationService_1.createNotification)(foodReq.ngo_id, '✅ Request Approved!', `Your request for "${foodReq.food_name}" has been approved! Ready for pickup.`, 'request_approved', req.user.id, id, 'request');
        res.status(200).json({ success: true, message: 'Request approved successfully', request: updatedReq });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error approving request' });
    }
};
exports.approveRequest = approveRequest;
const rejectRequest = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const foodReq = await Request_1.RequestModel.findById(id);
        if (!foodReq) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (foodReq.restaurant_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
        }
        const updatedReq = await Request_1.RequestModel.reject(id);
        // Notify NGO
        await (0, notificationService_1.createNotification)(foodReq.ngo_id, '❌ Request Rejected', `Your request for "${foodReq.food_name}" could not be fulfilled at this time.`, 'request_rejected', req.user.id, id, 'request');
        res.status(200).json({ success: true, message: 'Request rejected', request: updatedReq });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error rejecting request' });
    }
};
exports.rejectRequest = rejectRequest;
const collectFood = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const foodReq = await Request_1.RequestModel.findById(id);
        if (!foodReq) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        if (foodReq.ngo_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const updatedReq = await Request_1.RequestModel.collect(id);
        const food = await Food_1.FoodModel.findById(foodReq.food_id);
        if (food) {
            await Food_1.FoodModel.update(food.id, { status: 'collected' });
            // Create permanent Donation record
            await Donation_1.DonationModel.create({
                food_id: food.id,
                restaurant_id: food.restaurant_id,
                ngo_id: req.user.id,
                request_id: id,
                quantity: food.quantity,
                status: 'collected',
                notes: 'Handover complete via QR code verification'
            });
            // Notify Restaurant
            await (0, notificationService_1.createNotification)(food.restaurant_id, '🎉 Food Rescue Completed!', `Food "${food.food_name}" has been successfully collected by the NGO.`, 'reminder', req.user.id, id, 'donation');
        }
        res.status(200).json({ success: true, message: 'Food item marked as collected!', request: updatedReq });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating collection status' });
    }
};
exports.collectFood = collectFood;
const getQRCode = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const foodReq = await Request_1.RequestModel.findById(id);
        if (!foodReq) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }
        let existingQR = await QRCode_1.QRCodeModel.findByRequest(id);
        if (existingQR) {
            return res.status(200).json({ success: true, qrCode: existingQR.qr_code, token: existingQR.token });
        }
        const { qrCodeDataUrl, token } = await (0, qrService_1.generateQRCodeForRequest)(id);
        res.status(200).json({ success: true, qrCode: qrCodeDataUrl, token });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error generating QR code' });
    }
};
exports.getQRCode = getQRCode;
