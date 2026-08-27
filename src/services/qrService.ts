import QRCode from 'qrcode';
import crypto from 'crypto';
import { query } from '../config/db';
import { logError } from '../utils/logger';

export const generateQRCodeForRequest = async (requestId: number): Promise<{ qrCodeDataUrl: string; token: string }> => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const qrData = JSON.stringify({
      requestId,
      token,
      timestamp: Date.now()
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);

    const expiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    await query(
      `INSERT INTO qr_codes (request_id, qr_code, token, expiry_at)
       VALUES ($1, $2, $3, $4)`,
      [requestId, qrCodeDataUrl, token, expiryAt]
    );

    return { qrCodeDataUrl, token };
  } catch (error) {
    logError(`QR code generation failed for request #${requestId}: ${(error as Error).message}`);
    throw error;
  }
};
