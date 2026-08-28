import { Request, Response } from 'express';
import { RequestModel } from '../models/Request';
import { FoodModel } from '../models/Food';
import { DonationModel } from '../models/Donation';
import { createNotification } from '../services/notificationService';
import { generateQRCodeForRequest } from '../services/qrService';
import { QRCodeModel } from '../models/QRCode';

export const createRequest = async (req: Request, res: Response) => {
  try {
    const { food_id, request_message, collection_time, collection_date } = req.body;

    const food = await FoodModel.findById(parseInt(food_id, 10));
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (food.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Food item is no longer available' });
    }

    const foodReq = await RequestModel.create({
      food_id: food.id,
      ngo_id: req.user!.id,
      request_message,
      collection_time,
      collection_date
    });

    // Notify Restaurant
    await createNotification(
      food.restaurant_id,
      '📩 New Food Claim Request!',
      `An NGO has requested to claim your surplus food "${food.food_name}".`,
      'request_received',
      req.user!.id,
      foodReq.id,
      'request'
    );

    res.status(201).json({ success: true, message: 'Request submitted successfully', request: foodReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting food request' });
  }
};

export const getMyRequests = async (req: Request, res: Response) => {
  try {
    const requests = await RequestModel.findByNGO(req.user!.id);
    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
};

export const approveRequest = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const foodReq = await RequestModel.findById(id);

    if (!foodReq) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (foodReq.restaurant_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to approve this request' });
    }

    const updatedReq = await RequestModel.approve(id);
    await FoodModel.update(foodReq.food_id, { status: 'requested' });

    // Notify NGO
    await createNotification(
      foodReq.ngo_id,
      '✅ Request Approved!',
      `Your request for "${foodReq.food_name}" has been approved! Ready for pickup.`,
      'request_approved',
      req.user!.id,
      id,
      'request'
    );

    res.status(200).json({ success: true, message: 'Request approved successfully', request: updatedReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error approving request' });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const foodReq = await RequestModel.findById(id);

    if (!foodReq) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (foodReq.restaurant_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
    }

    const updatedReq = await RequestModel.reject(id);

    // Notify NGO
    await createNotification(
      foodReq.ngo_id,
      '❌ Request Rejected',
      `Your request for "${foodReq.food_name}" could not be fulfilled at this time.`,
      'request_rejected',
      req.user!.id,
      id,
      'request'
    );

    res.status(200).json({ success: true, message: 'Request rejected', request: updatedReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting request' });
  }
};

export const collectFood = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const foodReq = await RequestModel.findById(id);

    if (!foodReq) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (foodReq.ngo_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updatedReq = await RequestModel.collect(id);
    const food = await FoodModel.findById(foodReq.food_id);

    if (food) {
      await FoodModel.update(food.id, { status: 'collected' });

      // Create permanent Donation record
      await DonationModel.create({
        food_id: food.id,
        restaurant_id: food.restaurant_id,
        ngo_id: req.user!.id,
        request_id: id,
        quantity: food.quantity,
        status: 'collected',
        notes: 'Handover complete via QR code verification'
      });

      // Notify Restaurant
      await createNotification(
        food.restaurant_id,
        '🎉 Food Rescue Completed!',
        `Food "${food.food_name}" has been successfully collected by the NGO.`,
        'reminder',
        req.user!.id,
        id,
        'donation'
      );
    }

    res.status(200).json({ success: true, message: 'Food item marked as collected!', request: updatedReq });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating collection status' });
  }
};

export const getQRCode = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const foodReq = await RequestModel.findById(id);

    if (!foodReq) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    let qrCodeUrl: string;
    let token: string;

    let existingQR = await QRCodeModel.findByRequest(id);
    if (existingQR) {
      qrCodeUrl = existingQR.qr_code;
      token = existingQR.token;
    } else {
      const generated = await generateQRCodeForRequest(id);
      qrCodeUrl = generated.qrCodeUrl;
      token = generated.token;
    }

    res.status(200).json({ success: true, qrCode: qrCodeUrl, token });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating QR code' });
  }
};
