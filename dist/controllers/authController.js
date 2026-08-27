"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const SystemLog_1 = require("../models/SystemLog");
const emailService_1 = require("../services/emailService");
const helpers_1 = require("../utils/helpers");
const logger_1 = require("../utils/logger");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_rescue_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const createSendToken = (user, statusCode, res) => {
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true
    };
    res.cookie('token', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        success: true,
        token,
        user
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password, phone, address, role, organization_name, latitude, longitude } = req.body;
        const existingUser = await User_1.UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email address already registered' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.UserModel.create({
            name,
            email,
            password: hashedPassword,
            phone,
            address,
            role,
            organization_name,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined
        });
        await SystemLog_1.SystemLogModel.create({
            user_id: user.id,
            action: 'USER_REGISTERED',
            details: { email: user.email, role: user.role },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });
        // Send Welcome Email asynchronously
        (0, emailService_1.sendEmail)(user.email, 'Welcome to Food Rescue Platform!', `Hello ${user.name},\n\nThank you for registering as a ${user.role} on Food Rescue. Together we can end food waste!`);
        createSendToken(user, 201, res);
    }
    catch (error) {
        (0, logger_1.logError)(`Register error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server error during registration' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.UserModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password || '');
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        await SystemLog_1.SystemLogModel.create({
            user_id: user.id,
            action: 'USER_LOGIN',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });
        createSendToken(user, 200, res);
    }
    catch (error) {
        (0, logger_1.logError)(`Login error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found' });
        }
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { name, phone, address, organization_name, latitude, longitude } = req.body;
        const updated = await User_1.UserModel.update(req.user.id, {
            name,
            phone,
            address,
            organization_name,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined
        });
        res.status(200).json({ success: true, message: 'Profile updated successfully', user: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User_1.UserModel.findByEmail(req.user.email);
        if (!user || !(await bcryptjs_1.default.compare(oldPassword, user.password || ''))) {
            return res.status(400).json({ success: false, message: 'Incorrect old password' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await User_1.UserModel.update(req.user.id, { password: hashedPassword });
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error changing password' });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.UserModel.findByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user registered with this email' });
        }
        const resetToken = (0, helpers_1.generateToken)(20);
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await User_1.UserModel.update(user.id, {
            reset_token: resetToken,
            reset_token_expiry: resetExpiry
        });
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
        await (0, emailService_1.sendEmail)(user.email, 'Password Reset Token - Food Rescue', `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`);
        res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error initiating password reset' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const user = await User_1.UserModel.findByEmail(req.body.email || '');
        if (!user || user.reset_token !== token || !user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await User_1.UserModel.update(user.id, {
            password: hashedPassword,
            reset_token: null,
            reset_token_expiry: null
        });
        res.status(200).json({ success: true, message: 'Password has been reset successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
};
exports.resetPassword = resetPassword;
