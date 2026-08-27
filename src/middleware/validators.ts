import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({ field: err.type === 'field' ? err.path : 'unknown', message: err.msg }))
    });
  }
  next();
};

export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('role').isIn(['restaurant', 'ngo', 'admin']).withMessage('Role must be restaurant or ngo'),
  handleValidationErrors
];

export const validateLogin = [
  body('email').trim().isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

export const validateFood = [
  body('food_name').trim().notEmpty().withMessage('Food name is required').isLength({ min: 2 }).withMessage('Food name must be at least 2 characters'),
  body('quantity').trim().notEmpty().withMessage('Quantity is required'),
  body('food_type').isIn(['vegetarian', 'non-vegetarian', 'both']).withMessage('Food type must be vegetarian, non-vegetarian, or both'),
  handleValidationErrors
];
