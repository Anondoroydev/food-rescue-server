"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getDbPath = () => {
    if (process.env.SQLITE_PATH)
        return process.env.SQLITE_PATH;
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
    if (isVercel) {
        const tmpDbPath = path_1.default.join('/tmp', 'food_rescue.db');
        const localDbPath = path_1.default.join(process.cwd(), 'food_rescue.db');
        if (!fs_1.default.existsSync(tmpDbPath) && fs_1.default.existsSync(localDbPath)) {
            try {
                fs_1.default.copyFileSync(localDbPath, tmpDbPath);
            }
            catch (_) { }
        }
        return tmpDbPath;
    }
    return path_1.default.join(process.cwd(), 'food_rescue.db');
};
let db;
try {
    const dbPath = getDbPath();
    exports.db = db = new better_sqlite3_1.default(dbPath);
    try {
        db.pragma('journal_mode = WAL');
    }
    catch (_) {
        db.pragma('journal_mode = DELETE');
    }
    db.pragma('foreign_keys = ON');
}
catch (_) {
    try {
        const fallbackPath = path_1.default.join('/tmp', 'food_rescue.db');
        exports.db = db = new better_sqlite3_1.default(fallbackPath);
        db.pragma('foreign_keys = ON');
    }
    catch (_) {
        exports.db = db = new better_sqlite3_1.default(':memory:');
        db.pragma('foreign_keys = ON');
    }
}
exports.default = db;
