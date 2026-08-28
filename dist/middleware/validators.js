"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFood = exports.validateLogin = exports.validateRegister = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({ field: err.type === 'field' ? err.path : 'unknown', message: err.msg }))
        });
    }
    next();
};
exports.validateRegister = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('phone').trim().notEmpty().withMessage('Phone number is required'),
    (0, express_validator_1.body)('role').isIn(['restaurant', 'ngo', 'admin']).withMessage('Role must be restaurant or ngo'),
    handleValidationErrors
];
exports.validateLogin = [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];
exports.validateFood = [
    (0, express_validator_1.body)('food_name').trim().notEmpty().withMessage('Food name is required').isLength({ min: 2 }).withMessage('Food name must be at least 2 characters'),
    (0, express_validator_1.body)('quantity').trim().notEmpty().withMessage('Quantity is required'),
    (0, express_validator_1.body)('food_type').isIn(['vegetarian', 'non-vegetarian', 'both']).withMessage('Food type must be vegetarian, non-vegetarian, or both'),
    handleValidationErrors
];
