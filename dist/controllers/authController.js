"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.updateProfile = exports.getProfile = exports.login = exports.register = exports.getInMemoryUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const SystemLog_1 = require("../models/SystemLog");
const emailService_1 = require("../services/emailService");
const helpers_1 = require("../utils/helpers");
const logger_1 = require("../utils/logger");
const devStore_1 = require("../utils/devStore");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_rescue_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
// Dev store persistence (local JSON) used when DB is unavailable
const getInMemoryUsers = () => {
    return (require('../utils/devStore').getDevUsers() || []).map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, is_active: u.is_active }));
};
exports.getInMemoryUsers = getInMemoryUsers;
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
        // Try database first
        try {
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
            try {
                await SystemLog_1.SystemLogModel.create({
                    user_id: user.id,
                    action: 'USER_REGISTERED',
                    details: { email: user.email, role: user.role },
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });
            }
            catch (_) { }
            // Send Welcome Email asynchronously
            (0, emailService_1.sendEmail)(user.email, 'Welcome to Food Rescue Platform!', `Hello ${user.name},\n\nThank you for registering as a ${user.role} on Food Rescue. Together we can end food waste!`);
            return createSendToken(user, 201, res);
        }
        catch (dbErr) {
            // DB unavailable: fallback to persistent dev store
            (0, logger_1.logError)(`Database error during register (fallback to dev-store): ${dbErr.message}`);
            if ((0, devStore_1.getDevUserByEmail)(email)) {
                return res.status(400).json({ success: false, message: 'Email address already registered (dev-store)' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = {
                id: -Date.now(),
                name,
                email,
                password: hashedPassword,
                phone,
                address,
                role: role || 'user',
                organization_name,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined,
                is_active: true
            };
            (0, devStore_1.addDevUser)(user);
            try {
                (0, emailService_1.sendEmail)(user.email, 'Welcome to Food Rescue Platform!', `Hello ${user.name},\n\nThank you for registering as a ${user.role} on Food Rescue. Together we can end food waste!`);
            }
            catch (_) { }
            return createSendToken(user, 201, res);
        }
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
        // Try DB lookup first
        try {
            const user = await User_1.UserModel.findByEmail(email);
            if (!user) {
                // If not found in DB, check persistent dev store before failing
                const memUser = (0, devStore_1.getDevUserByEmail)(email);
                if (!memUser) {
                    return res.status(401).json({ success: false, message: 'Invalid email or password' });
                }
                // treat memUser as the user for the rest of the flow
                if (!memUser.is_active) {
                    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
                }
                const isMatchMem = await bcryptjs_1.default.compare(password, memUser.password || '');
                if (!isMatchMem) {
                    return res.status(401).json({ success: false, message: 'Invalid email or password' });
                }
                // Auto-sync memUser to SQLite users table so they get a real SQLite ID
                let syncedUser = memUser;
                try {
                    const insertedUser = await User_1.UserModel.create({
                        name: memUser.name,
                        email: memUser.email,
                        password: memUser.password || password,
                        phone: memUser.phone || '0000000000',
                        address: memUser.address,
                        role: (memUser.role || 'restaurant'),
                        organization_name: memUser.organization_name,
                        latitude: memUser.latitude,
                        longitude: memUser.longitude
                    });
                    syncedUser = insertedUser;
                }
                catch (_) {
                    const dbUser = await User_1.UserModel.findByEmail(memUser.email);
                    if (dbUser)
                        syncedUser = dbUser;
                }
                await SystemLog_1.SystemLogModel.create({
                    user_id: syncedUser.id,
                    action: 'DEV_STORE_USER_LOGIN',
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                }).catch(() => { });
                return createSendToken(syncedUser, 200, res);
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
            return createSendToken(user, 200, res);
        }
        catch (dbErr) {
            // DB unavailable: try persistent dev store
            (0, logger_1.logError)(`Database error during login (fallback to dev-store): ${dbErr.message}`);
            const memUser = (0, devStore_1.getDevUserByEmail)(email);
            if (!memUser) {
                // DB is unavailable and user not in dev store: treat as auth failure
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
            if (!memUser.is_active) {
                return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, memUser.password || '');
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
            await SystemLog_1.SystemLogModel.create({
                user_id: memUser.id,
                action: 'DEV_STORE_USER_LOGIN',
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            }).catch(() => { });
            return createSendToken(memUser, 200, res);
        }
    }
    catch (error) {
        (0, logger_1.logError)(`Login error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        // Try DB first
        try {
            const user = await User_1.UserModel.findById(req.user.id);
            if (user) {
                return res.status(200).json({ success: true, user });
            }
            // If not in DB, fall through to dev-store lookup
        }
        catch (dbErr) {
            // DB unavailable — will attempt dev-store below
        }
        // Dev-store fallback: look up by email from the authenticated token
        try {
            const devUser = (req.user && req.user.email) ? (0, devStore_1.getDevUserByEmail)(req.user.email) : undefined;
            if (!devUser) {
                return res.status(404).json({ success: false, message: 'User profile not found' });
            }
            // Remove sensitive fields
            const safe = { ...devUser };
            if (safe.password)
                delete safe.password;
            return res.status(200).json({ success: true, user: safe });
        }
        catch (e) {
            return res.status(500).json({ success: false, message: 'Error fetching profile' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { name, phone, address, organization_name, latitude, longitude } = req.body;
        // Try DB update first
        try {
            const updated = await User_1.UserModel.update(req.user.id, {
                name,
                phone,
                address,
                organization_name,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined
            });
            return res.status(200).json({ success: true, message: 'Profile updated successfully', user: updated });
        }
        catch (dbErr) {
            // DB unavailable: update dev-store if present
            const email = req.user?.email;
            if (!email)
                return res.status(500).json({ success: false, message: 'Error updating profile' });
            const updatedDev = (0, devStore_1.updateDevUser)(email, {
                name,
                phone,
                address,
                organization_name,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined
            });
            if (!updatedDev)
                return res.status(500).json({ success: false, message: 'Error updating profile' });
            const safe = { ...updatedDev };
            if (safe.password)
                delete safe.password;
            return res.status(200).json({ success: true, message: 'Profile updated successfully (dev-store)', user: safe });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        // Try DB first
        try {
            const user = await User_1.UserModel.findByEmail(req.user.email);
            if (!user || !(await bcryptjs_1.default.compare(oldPassword, user.password || ''))) {
                return res.status(400).json({ success: false, message: 'Incorrect old password' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            await User_1.UserModel.update(req.user.id, { password: hashedPassword });
            return res.status(200).json({ success: true, message: 'Password updated successfully' });
        }
        catch (dbErr) {
            // DB unavailable: try dev-store
            (0, logger_1.logError)(`Database error during changePassword (dev fallback): ${dbErr.message}`);
            const devUser = (0, devStore_1.getDevUserByEmail)(req.user.email);
            if (!devUser) {
                return res.status(500).json({ success: false, message: 'Error changing password' });
            }
            const match = await bcryptjs_1.default.compare(oldPassword, devUser.password || '');
            if (!match) {
                return res.status(400).json({ success: false, message: 'Incorrect old password' });
            }
            const hashed = await bcryptjs_1.default.hash(newPassword, 10);
            const updated = (0, devStore_1.updateDevUser)(devUser.email, { password: hashed });
            if (!updated)
                return res.status(500).json({ success: false, message: 'Error changing password' });
            return res.status(200).json({ success: true, message: 'Password updated successfully (dev-store)' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error changing password' });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        try {
            const user = await User_1.UserModel.findByEmail(email);
            if (!user) {
                const devUser = (0, devStore_1.getDevUserByEmail)(email);
                if (!devUser) {
                    return res.status(404).json({ success: false, message: 'No user registered with this email' });
                }
                const resetToken = (0, helpers_1.generateToken)(20);
                const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const updated = (0, devStore_1.updateDevUser)(email, {
                    reset_token: resetToken,
                    reset_token_expiry: resetExpiry
                });
                if (!updated) {
                    return res.status(500).json({ success: false, message: 'Error initiating password reset' });
                }
                const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
                await (0, emailService_1.sendEmail)(updated.email, 'Password Reset Token - Food Rescue', `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`).catch(() => undefined);
                return res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
            }
            const resetToken = (0, helpers_1.generateToken)(20);
            const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await User_1.UserModel.update(user.id, {
                reset_token: resetToken,
                reset_token_expiry: resetExpiry
            });
            const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
            await (0, emailService_1.sendEmail)(user.email, 'Password Reset Token - Food Rescue', `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`).catch(() => undefined);
            return res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
        }
        catch (dbErr) {
            (0, logger_1.logError)(`Database error during forgotPassword fallback: ${dbErr.message}`);
            const devUser = (0, devStore_1.getDevUserByEmail)(email);
            if (!devUser) {
                return res.status(404).json({ success: false, message: 'No user registered with this email' });
            }
            const resetToken = (0, helpers_1.generateToken)(20);
            const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const updated = (0, devStore_1.updateDevUser)(email, {
                reset_token: resetToken,
                reset_token_expiry: resetExpiry
            });
            if (!updated) {
                return res.status(500).json({ success: false, message: 'Error initiating password reset' });
            }
            const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
            await (0, emailService_1.sendEmail)(updated.email, 'Password Reset Token - Food Rescue', `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`).catch(() => undefined);
            return res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
        }
    }
    catch (error) {
        (0, logger_1.logError)(`Forgot password error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error initiating password reset' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        // Validate inputs
        if (!email || !token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, token, and newPassword are required' });
        }
        try {
            const user = await User_1.UserModel.findByEmail(email);
            if (!user) {
                const devUser = (0, devStore_1.getDevUserByEmail)(email);
                if (!devUser) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }
                if (!devUser.reset_token) {
                    return res.status(400).json({ success: false, message: 'No reset token found for this user' });
                }
                if (devUser.reset_token !== token) {
                    return res.status(400).json({ success: false, message: 'Invalid reset token' });
                }
                const expiryDate = new Date(devUser.reset_token_expiry || 0);
                const now = new Date();
                if (expiryDate < now) {
                    return res.status(400).json({ success: false, message: 'Reset token expired' });
                }
                const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
                const updated = (0, devStore_1.updateDevUser)(email, {
                    password: hashedPassword,
                    reset_token: null,
                    reset_token_expiry: null
                });
                if (!updated) {
                    return res.status(500).json({ success: false, message: 'Error resetting password' });
                }
                return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
            }
            if (!user.reset_token) {
                return res.status(400).json({ success: false, message: 'No reset token found for this user' });
            }
            if (user.reset_token !== token) {
                return res.status(400).json({ success: false, message: 'Invalid reset token' });
            }
            if (!user.reset_token_expiry) {
                return res.status(400).json({ success: false, message: 'Token expiry not set' });
            }
            const expiryDate = new Date(user.reset_token_expiry);
            const now = new Date();
            if (expiryDate < now) {
                return res.status(400).json({ success: false, message: `Reset token expired. Token expiry: ${expiryDate.toISOString()}, Current time: ${now.toISOString()}` });
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            await User_1.UserModel.update(user.id, {
                password: hashedPassword,
                reset_token: null,
                reset_token_expiry: null
            });
            return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
        }
        catch (dbErr) {
            (0, logger_1.logError)(`Database error during resetPassword fallback: ${dbErr.message}`);
            const devUser = (0, devStore_1.getDevUserByEmail)(email);
            if (!devUser) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            if (!devUser.reset_token) {
                return res.status(400).json({ success: false, message: 'No reset token found for this user' });
            }
            if (devUser.reset_token !== token) {
                return res.status(400).json({ success: false, message: 'Invalid reset token' });
            }
            const expiryDate = new Date(devUser.reset_token_expiry || 0);
            const now = new Date();
            if (expiryDate < now) {
                return res.status(400).json({ success: false, message: 'Reset token expired' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            const updated = (0, devStore_1.updateDevUser)(email, {
                password: hashedPassword,
                reset_token: null,
                reset_token_expiry: null
            });
            if (!updated) {
                return res.status(500).json({ success: false, message: 'Error resetting password' });
            }
            return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
        }
    }
    catch (error) {
        (0, logger_1.logError)(`Reset password error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
};
exports.resetPassword = resetPassword;
