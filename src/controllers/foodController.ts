import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FoodModel } from '../models/Food';
import { UserModel } from '../models/User';
import { createNotification } from '../services/notificationService';
import { SystemLogModel } from '../models/SystemLog';
import { logError } from '../utils/logger';

export const getAllFoods = async (req: Request, res: Response) => {
  try {
    const { status, food_type, search } = req.query;
    const foods = await FoodModel.findAll({
      status: status as string,
      food_type: food_type as string,
      search: search as string
    });
    res.status(200).json({ success: true, count: foods.length, foods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving food postings' });
  }
};

export const getNearbyFoods = async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude query params are required' });
    }

    const radiusKm = radius ? parseFloat(radius as string) : 15;
    const foods = await FoodModel.findNearby(parseFloat(lat as string), parseFloat(lon as string), radiusKm);
    res.status(200).json({ success: true, count: foods.length, foods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving nearby foods' });
  }
};

export const getFoodById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const food = await FoodModel.findById(id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    await FoodModel.incrementViewCount(id);

    res.status(200).json({ success: true, food });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving food details' });
  }
};

export const createFood = async (req: Request, res: Response) => {
  try {
    const { food_name, description, quantity, food_type, pickup_time, pickup_date, expiry_time } = req.body;

    let imagePath: string | undefined;
    if (req.file) {
      imagePath = `/uploads/foods/${req.file.filename}`;
    }

    const food = await FoodModel.create({
      restaurant_id: req.user!.id,
      food_name,
      description,
      quantity,
      food_type,
      image: imagePath,
      pickup_time,
      pickup_date,
      expiry_time: expiry_time ? new Date(expiry_time) : undefined
    });

    await SystemLogModel.create({
      user_id: req.user!.id,
      action: 'FOOD_POSTED',
      details: { food_id: food.id, food_name: food.food_name },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Notify all active NGOs about new food posting
    const ngos = await UserModel.getAll('ngo');
    for (const ngo of ngos) {
      await createNotification(
        ngo.id,
        '🍱 New Surplus Food Available!',
        `A new surplus food "${food.food_name}" (${food.quantity}) was posted nearby.`,
        'food_posted',
        req.user!.id,
        food.id,
        'food'
      );
    }

    res.status(201).json({ success: true, message: 'Surplus food posted successfully', food });
  } catch (error) {
    const err = error as Error;
    logError && typeof logError === 'function' && logError(`Error creating food post: ${err.stack || err.message}`);
    console.error('Error creating food post:', err);
    res.status(500).json({ success: false, message: 'Error creating food post', error: process.env.NODE_ENV === 'production' ? undefined : err.message });
  }
};

export const updateFood = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await FoodModel.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (existing.restaurant_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this food item' });
    }

    let imagePath = existing.image;
    if (req.file) {
      imagePath = `/uploads/foods/${req.file.filename}`;
    }

    const updated = await FoodModel.update(id, {
      ...req.body,
      image: imagePath,
      expiry_time: req.body.expiry_time ? new Date(req.body.expiry_time) : existing.expiry_time
    });

    res.status(200).json({ success: true, message: 'Food details updated', food: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating food item' });
  }
};

export const deleteFood = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await FoodModel.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (existing.restaurant_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this food item' });
    }

    if (existing.image) {
      const fullPath = path.join(process.cwd(), existing.image);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await FoodModel.delete(id);

    res.status(200).json({ success: true, message: 'Food posting deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting food item' });
  }
};
