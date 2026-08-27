import { Request, Response } from 'express';
import { DonationModel } from '../models/Donation';

export const getDonations = async (req: Request, res: Response) => {
  try {
    let donations;
    if (req.user!.role === 'restaurant') {
      donations = await DonationModel.findByRestaurant(req.user!.id);
    } else if (req.user!.role === 'ngo') {
      donations = await DonationModel.findByNGO(req.user!.id);
    } else {
      // Admin sees all
      const stats = await DonationModel.getStats();
      donations = await DonationModel.findByRestaurant(0); // placeholder or fetch all
    }
    res.status(200).json({ success: true, count: donations.length, donations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving donations' });
  }
};

export const getDonationStats = async (_req: Request, res: Response) => {
  try {
    const stats = await DonationModel.getStats();
    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving donation stats' });
  }
};
