"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidLongitude = exports.isValidLatitude = exports.isValidPhone = exports.isValidEmail = void 0;
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    return phoneRegex.test(phone);
};
exports.isValidPhone = isValidPhone;
const isValidLatitude = (lat) => {
    return typeof lat === 'number' && lat >= -90 && lat <= 90;
};
exports.isValidLatitude = isValidLatitude;
const isValidLongitude = (lon) => {
    return typeof lon === 'number' && lon >= -180 && lon <= 180;
};
exports.isValidLongitude = isValidLongitude;
