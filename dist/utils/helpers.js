"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSV = exports.generateToken = exports.getDistance = exports.formatDate = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const formatDate = (date) => {
    if (!date)
        return 'N/A';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};
exports.formatDate = formatDate;
/**
 * Calculate distance between two coordinates using Haversine formula (returns kilometers)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
};
exports.getDistance = getDistance;
const generateToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateToken = generateToken;
const parseCSV = (filePath) => {
    if (!fs_1.default.existsSync(filePath))
        return [];
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0)
        return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });
};
exports.parseCSV = parseCSV;
