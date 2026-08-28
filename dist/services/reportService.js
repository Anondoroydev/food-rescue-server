"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFReport = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const paths_1 = require("../config/paths");
const reportDir = paths_1.REPORT_PATH;
try {
    if (!fs_1.default.existsSync(reportDir)) {
        fs_1.default.mkdirSync(reportDir, { recursive: true });
    }
}
catch (_) { }
const generatePDFReport = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const filename = `donation-report-${Date.now()}.pdf`;
            const filePath = path_1.default.join(reportDir, filename);
            const doc = new pdfkit_1.default({ margin: 50 });
            const stream = fs_1.default.createWriteStream(filePath);
            doc.pipe(stream);
            // Header
            doc.fillColor('#10B981').fontSize(24).text('Food Rescue Platform Summary Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fillColor('#6B7280').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(1.5);
            // Summary Statistics Query
            const usersCount = await (0, db_1.query)(`SELECT COUNT(*) FROM users`);
            const foodsCount = await (0, db_1.query)(`SELECT COUNT(*) FROM foods`);
            const requestsCount = await (0, db_1.query)(`SELECT COUNT(*) FROM requests`);
            const donationsCount = await (0, db_1.query)(`SELECT COUNT(*) FROM donations WHERE status = 'collected' OR status = 'delivered'`);
            doc.fillColor('#111827').fontSize(16).text('Platform Overview');
            doc.moveDown(0.5);
            doc.fontSize(11)
                .text(`Total Registered Users: ${usersCount.rows[0].count}`)
                .text(`Total Food Donations Posted: ${foodsCount.rows[0].count}`)
                .text(`Total Food Requests Placed: ${requestsCount.rows[0].count}`)
                .text(`Successful Rescues & Deliveries: ${donationsCount.rows[0].count}`);
            doc.moveDown(1.5);
            doc.fillColor('#111827').fontSize(16).text('Recent Donations Summary');
            doc.moveDown(0.5);
            const recentDonations = await (0, db_1.query)(`
        SELECT d.id, f.food_name, u1.name as restaurant_name, u2.name as ngo_name, d.quantity, d.status, d.created_at
        FROM donations d
        JOIN foods f ON d.food_id = f.id
        JOIN users u1 ON d.restaurant_id = u1.id
        JOIN users u2 ON d.ngo_id = u2.id
        ORDER BY d.created_at DESC
        LIMIT 10
      `);
            if (recentDonations.rows.length === 0) {
                doc.fontSize(10).fillColor('#6B7280').text('No recorded completed donations yet.');
            }
            else {
                recentDonations.rows.forEach((d, idx) => {
                    doc.fontSize(10).fillColor('#1F2937')
                        .text(`${idx + 1}. Food: ${d.food_name} (${d.quantity}) | Restaurant: ${d.restaurant_name} | NGO: ${d.ngo_name} | Status: ${d.status}`);
                    doc.moveDown(0.2);
                });
            }
            doc.moveDown(2);
            doc.fillColor('#9CA3AF').fontSize(9).text('Zero Food Waste Initiative • Powered by Food Rescue Application', { align: 'center' });
            doc.end();
            stream.on('finish', () => {
                resolve(filePath);
            });
            stream.on('error', (err) => {
                reject(err);
            });
        }
        catch (error) {
            (0, logger_1.logError)(`Report generation failed: ${error.message}`);
            reject(error);
        }
    });
};
exports.generatePDFReport = generatePDFReport;
