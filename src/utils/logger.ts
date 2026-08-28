import fs from 'fs';
import path from 'path';
import { LOG_PATH } from '../config/paths';

const getLogFileName = () => {
  const dateStr = new Date().toISOString().split('T')[0];
  return path.join(LOG_PATH, `app-${dateStr}.log`);
};

const writeLog = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.toUpperCase()}]: ${message}\n`;
  console.log(formattedMessage.trim());
  try {
    fs.appendFileSync(getLogFileName(), formattedMessage);
  } catch (err) {
    console.error('Failed to write log to file', err);
  }
};

export const logInfo = (message: string) => writeLog('info', message);
export const logError = (message: string) => writeLog('error', message);
export const logWarn = (message: string) => writeLog('warn', message);
export const logDebug = (message: string) => writeLog('debug', message);
