"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_PATH = exports.REPORT_PATH = exports.UPLOAD_PATH = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
exports.UPLOAD_PATH = process.env.UPLOAD_PATH || (isVercel ? '/tmp/uploads' : './uploads');
exports.REPORT_PATH = process.env.REPORT_PATH || (isVercel ? '/tmp/reports' : './reports');
exports.LOG_PATH = process.env.LOG_PATH || (isVercel ? '/tmp/logs' : './logs');
// Ensure directories exist
[exports.UPLOAD_PATH, exports.REPORT_PATH, exports.LOG_PATH, path_1.default.join(exports.UPLOAD_PATH, 'foods')].forEach(dir => {
    try {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    catch (_) { }
});
exports.default = {
    UPLOAD_PATH: exports.UPLOAD_PATH,
    REPORT_PATH: exports.REPORT_PATH,
    LOG_PATH: exports.LOG_PATH
};
