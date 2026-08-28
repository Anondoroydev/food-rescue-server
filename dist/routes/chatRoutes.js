"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/:userId', auth_1.authenticate, chatController_1.getChatHistory);
router.post('/', auth_1.authenticate, chatController_1.sendMessage);
exports.default = router;
