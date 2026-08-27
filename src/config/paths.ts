import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
export const REPORT_PATH = process.env.REPORT_PATH || './reports';
export const LOG_PATH = process.env.LOG_PATH || './logs';

// Ensure directories exist
[UPLOAD_PATH, REPORT_PATH, LOG_PATH, path.join(UPLOAD_PATH, 'foods')].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export default {
  UPLOAD_PATH,
  REPORT_PATH,
  LOG_PATH
};
