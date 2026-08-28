"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../utils/logger");
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    auth: {
        user: process.env.SMTP_USER || 'testuser',
        pass: process.env.SMTP_PASS || 'testpass'
    }
});
const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'FoodRescue Platform'}" <${process.env.FROM_EMAIL || 'no-reply@foodrescue.com'}>`,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`
        };
        const info = await transporter.sendMail(mailOptions);
        (0, logger_1.logInfo)(`Email sent to ${to}: ${info.messageId}`);
        return true;
    }
    catch (error) {
        (0, logger_1.logError)(`Failed to send email to ${to}: ${error.message}`);
        return false;
    }
};
exports.sendEmail = sendEmail;
