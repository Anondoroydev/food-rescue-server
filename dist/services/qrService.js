"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRCodeForRequest = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const generateQRCodeForRequest = async (requestId) => {
    try {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const qrData = JSON.stringify({
            requestId,
            token,
            timestamp: Date.now()
        });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(qrData);
        const expiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity
        await (0, db_1.query)(`INSERT INTO qr_codes (request_id, qr_code, token, expiry_at)
       VALUES ($1, $2, $3, $4)`, [requestId, qrCodeDataUrl, token, expiryAt]);
        return { qrCodeDataUrl, token };
    }
    catch (error) {
        (0, logger_1.logError)(`QR code generation failed for request #${requestId}: ${error.message}`);
        throw error;
    }
};
exports.generateQRCodeForRequest = generateQRCodeForRequest;
