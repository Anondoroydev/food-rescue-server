import { Router } from 'express';
import {
  getAllFoods,
  getNearbyFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood
} from '../controllers/foodController';
import { authenticate, isRestaurant } from '../middleware/auth';
import { uploadFoodImage } from '../middleware/upload';
import { validateFood } from '../middleware/validators';

const router = Router();

router.get('/', getAllFoods);
router.get('/nearby', getNearbyFoods);
router.get('/:id', getFoodById);
router.post('/', authenticate, isRestaurant, uploadFoodImage.single('image'), validateFood, createFood);
router.put('/:id', authenticate, isRestaurant, uploadFoodImage.single('image'), updateFood);
router.delete('/:id', authenticate, isRestaurant, deleteFood);

export default router;
