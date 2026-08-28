"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logWarn = exports.logError = exports.logInfo = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("../config/paths");
const getLogFileName = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    return path_1.default.join(paths_1.LOG_PATH, `app-${dateStr}.log`);
};
const writeLog = (level, message) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}]: ${message}\n`;
    console.log(formattedMessage.trim());
    try {
        fs_1.default.appendFileSync(getLogFileName(), formattedMessage);
    }
    catch (err) {
        console.error('Failed to write log to file', err);
    }
};
const logInfo = (message) => writeLog('info', message);
exports.logInfo = logInfo;
const logError = (message) => writeLog('error', message);
exports.logError = logError;
const logWarn = (message) => writeLog('warn', message);
exports.logWarn = logWarn;
const logDebug = (message) => writeLog('debug', message);
exports.logDebug = logDebug;
