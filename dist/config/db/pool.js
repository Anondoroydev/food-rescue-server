"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 1500 }
    : { host: process.env.PGHOST || 'localhost', port: parseInt(process.env.PGPORT || '5432', 10), database: process.env.PGDATABASE || 'food_rescue_db', user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || 'postgres', max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 1500 };
exports.pool = new pg_1.Pool(poolConfig);
exports.default = exports.pool;
