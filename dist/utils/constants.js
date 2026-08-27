"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_TYPES = exports.REQUEST_STATUS = exports.FOOD_STATUS = exports.USER_ROLES = void 0;
exports.USER_ROLES = ['restaurant', 'ngo', 'admin'];
exports.FOOD_STATUS = ['available', 'requested', 'collected', 'expired'];
exports.REQUEST_STATUS = ['pending', 'approved', 'rejected', 'collected', 'delivered'];
exports.NOTIFICATION_TYPES = [
    'food_posted',
    'request_received',
    'request_approved',
    'request_rejected',
    'reminder',
    'alert',
    'message'
];
