import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { logError } from '../utils/logger';

import { UPLOAD_PATH } from '../config/paths';

export const generateQRCodeForRequest = async (requestId: number): Promise<{ qrCodeUrl: string; token: string }> => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const qrData = JSON.stringify({
      requestId,
      token,
      timestamp: Date.now()
    });

    const qrDir = path.join(UPLOAD_PATH, 'qr');
    try {
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
    } catch (_) {}

    const fileName = `qr_request_${requestId}.png`;
    const filePath = path.join(qrDir, fileName);
    await QRCode.toFile(filePath, qrData);

    const qrCodeUrl = `/uploads/qr/${fileName}`;
    const expiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours validity

    await query(
      `INSERT INTO qr_codes (request_id, qr_code, token, expiry_at)
       VALUES ($1, $2, $3, $4)`,
      [requestId, qrCodeUrl, token, expiryAt]
    );

    return { qrCodeUrl, token };
  } catch (error) {
    logError(`QR code generation failed for request #${requestId}: ${(error as Error).message}`);
    throw error;
  }
};
