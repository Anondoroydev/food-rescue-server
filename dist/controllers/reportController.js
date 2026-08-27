"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPDF = void 0;
const reportService_1 = require("../services/reportService");
const downloadPDF = async (_req, res) => {
    try {
        const filePath = await (0, reportService_1.generatePDFReport)();
        res.download(filePath, 'FoodRescue_Summary_Report.pdf');
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
    }
};
exports.downloadPDF = downloadPDF;
