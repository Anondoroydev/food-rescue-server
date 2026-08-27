import { Request, Response } from 'express';
import { generatePDFReport } from '../services/reportService';

export const downloadPDF = async (_req: Request, res: Response) => {
  try {
    const filePath = await generatePDFReport();
    res.download(filePath, 'FoodRescue_Summary_Report.pdf');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
};
