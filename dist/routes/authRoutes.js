"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../middleware/validators");
const authController_2 = require("../controllers/authController");
const router = (0, express_1.Router)();
router.post('/register', validators_1.validateRegister, authController_1.register);
router.post('/login', validators_1.validateLogin, authController_1.login);
router.get('/profile', auth_1.authenticate, authController_1.getProfile);
router.put('/profile', auth_1.authenticate, authController_1.updateProfile);
router.post('/change-password', auth_1.authenticate, authController_1.changePassword);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
if (process.env.NODE_ENV !== 'production') {
    router.get('/debug/mem-users', (_req, res) => {
        try {
            res.json({ success: true, users: (0, authController_2.getInMemoryUsers)() });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Unable to read dev users' });
        }
    });
}
exports.default = router;
