"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFood = exports.updateFood = exports.createFood = exports.getFoodById = exports.getNearbyFoods = exports.getAllFoods = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Food_1 = require("../models/Food");
const User_1 = require("../models/User");
const notificationService_1 = require("../services/notificationService");
const SystemLog_1 = require("../models/SystemLog");
const logger_1 = require("../utils/logger");
const getAllFoods = async (req, res) => {
    try {
        const { status, food_type, search } = req.query;
        const foods = await Food_1.FoodModel.findAll({
            status: status,
            food_type: food_type,
            search: search
        });
        res.status(200).json({ success: true, count: foods.length, foods });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving food postings' });
    }
};
exports.getAllFoods = getAllFoods;
const getNearbyFoods = async (req, res) => {
    try {
        const { lat, lon, radius } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ success: false, message: 'Latitude and Longitude query params are required' });
        }
        const radiusKm = radius ? parseFloat(radius) : 15;
        const foods = await Food_1.FoodModel.findNearby(parseFloat(lat), parseFloat(lon), radiusKm);
        res.status(200).json({ success: true, count: foods.length, foods });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving nearby foods' });
    }
};
exports.getNearbyFoods = getNearbyFoods;
const getFoodById = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const food = await Food_1.FoodModel.findById(id);
        if (!food) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        await Food_1.FoodModel.incrementViewCount(id);
        res.status(200).json({ success: true, food });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving food details' });
    }
};
exports.getFoodById = getFoodById;
const createFood = async (req, res) => {
    try {
        const { food_name, description, quantity, food_type, pickup_time, pickup_date, expiry_time } = req.body;
        let imagePath;
        if (req.file) {
            imagePath = `/uploads/foods/${req.file.filename}`;
        }
        const food = await Food_1.FoodModel.create({
            restaurant_id: req.user.id,
            food_name,
            description,
            quantity,
            food_type,
            image: imagePath,
            pickup_time,
            pickup_date,
            expiry_time: expiry_time ? new Date(expiry_time) : undefined
        });
        await SystemLog_1.SystemLogModel.create({
            user_id: req.user.id,
            action: 'FOOD_POSTED',
            details: { food_id: food.id, food_name: food.food_name },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });
        // Notify all active NGOs about new food posting
        const ngos = await User_1.UserModel.getAll('ngo');
        for (const ngo of ngos) {
            await (0, notificationService_1.createNotification)(ngo.id, '🍱 New Surplus Food Available!', `A new surplus food "${food.food_name}" (${food.quantity}) was posted nearby.`, 'food_posted', req.user.id, food.id, 'food');
        }
        res.status(201).json({ success: true, message: 'Surplus food posted successfully', food });
    }
    catch (error) {
        const err = error;
        logger_1.logError && typeof logger_1.logError === 'function' && (0, logger_1.logError)(`Error creating food post: ${err.stack || err.message}`);
        console.error('Error creating food post:', err);
        res.status(500).json({ success: false, message: 'Error creating food post', error: process.env.NODE_ENV === 'production' ? undefined : err.message });
    }
};
exports.createFood = createFood;
const updateFood = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const existing = await Food_1.FoodModel.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        if (existing.restaurant_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this food item' });
        }
        let imagePath = existing.image;
        if (req.file) {
            imagePath = `/uploads/foods/${req.file.filename}`;
        }
        const updated = await Food_1.FoodModel.update(id, {
            ...req.body,
            image: imagePath,
            expiry_time: req.body.expiry_time ? new Date(req.body.expiry_time) : existing.expiry_time
        });
        res.status(200).json({ success: true, message: 'Food details updated', food: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating food item' });
    }
};
exports.updateFood = updateFood;
const deleteFood = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const existing = await Food_1.FoodModel.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        if (existing.restaurant_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this food item' });
        }
        if (existing.image) {
            const fullPath = path_1.default.join(process.cwd(), existing.image);
            if (fs_1.default.existsSync(fullPath)) {
                fs_1.default.unlinkSync(fullPath);
            }
        }
        await Food_1.FoodModel.delete(id);
        res.status(200).json({ success: true, message: 'Food posting deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting food item' });
    }
};
exports.deleteFood = deleteFood;
