"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDonationStats = exports.getDonations = void 0;
const Donation_1 = require("../models/Donation");
const getDonations = async (req, res) => {
    try {
        let donations;
        if (req.user.role === 'restaurant') {
            donations = await Donation_1.DonationModel.findByRestaurant(req.user.id);
        }
        else if (req.user.role === 'ngo') {
            donations = await Donation_1.DonationModel.findByNGO(req.user.id);
        }
        else {
            // Admin sees all
            const stats = await Donation_1.DonationModel.getStats();
            donations = await Donation_1.DonationModel.findByRestaurant(0); // placeholder or fetch all
        }
        res.status(200).json({ success: true, count: donations.length, donations });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving donations' });
    }
};
exports.getDonations = getDonations;
const getDonationStats = async (_req, res) => {
    try {
        const stats = await Donation_1.DonationModel.getStats();
        res.status(200).json({ success: true, stats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving donation stats' });
    }
};
exports.getDonationStats = getDonationStats;
