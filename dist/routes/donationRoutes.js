"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const donationController_1 = require("../controllers/donationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, donationController_1.getDonations);
router.get('/stats', auth_1.authenticate, donationController_1.getDonationStats);
exports.default = router;
