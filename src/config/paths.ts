import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);

export const UPLOAD_PATH = process.env.UPLOAD_PATH || (isVercel ? '/tmp/uploads' : './uploads');
export const REPORT_PATH = process.env.REPORT_PATH || (isVercel ? '/tmp/reports' : './reports');
export const LOG_PATH = process.env.LOG_PATH || (isVercel ? '/tmp/logs' : './logs');

// Ensure directories exist
[UPLOAD_PATH, REPORT_PATH, LOG_PATH, path.join(UPLOAD_PATH, 'foods')].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {}
});

export default {
  UPLOAD_PATH,
  REPORT_PATH,
  LOG_PATH
};
