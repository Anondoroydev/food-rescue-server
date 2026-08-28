import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { logError } from '../utils/logger';

const reportDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

export const generatePDFReport = async (): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const filename = `donation-report-${Date.now()}.pdf`;
      const filePath = path.join(reportDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fillColor('#10B981').fontSize(24).text('Food Rescue Platform Summary Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fillColor('#6B7280').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Summary Statistics Query
      const usersCount = await query(`SELECT COUNT(*) FROM users`);
      const foodsCount = await query(`SELECT COUNT(*) FROM foods`);
      const requestsCount = await query(`SELECT COUNT(*) FROM requests`);
      const donationsCount = await query(`SELECT COUNT(*) FROM donations WHERE status = 'collected' OR status = 'delivered'`);

      doc.fillColor('#111827').fontSize(16).text('Platform Overview');
      doc.moveDown(0.5);
      doc.fontSize(11)
         .text(`Total Registered Users: ${usersCount.rows[0].count}`)
         .text(`Total Food Donations Posted: ${foodsCount.rows[0].count}`)
         .text(`Total Food Requests Placed: ${requestsCount.rows[0].count}`)
         .text(`Successful Rescues & Deliveries: ${donationsCount.rows[0].count}`);

      doc.moveDown(1.5);
      doc.fillColor('#111827').fontSize(16).text('Recent Donations Summary');
      doc.moveDown(0.5);

      const recentDonations = await query(`
        SELECT d.id, f.food_name, u1.name as restaurant_name, u2.name as ngo_name, d.quantity, d.status, d.created_at
        FROM donations d
        JOIN foods f ON d.food_id = f.id
        JOIN users u1 ON d.restaurant_id = u1.id
        JOIN users u2 ON d.ngo_id = u2.id
        ORDER BY d.created_at DESC
        LIMIT 10
      `);

      if (recentDonations.rows.length === 0) {
        doc.fontSize(10).fillColor('#6B7280').text('No recorded completed donations yet.');
      } else {
        recentDonations.rows.forEach((d, idx) => {
          doc.fontSize(10).fillColor('#1F2937')
             .text(`${idx + 1}. Food: ${d.food_name} (${d.quantity}) | Restaurant: ${d.restaurant_name} | NGO: ${d.ngo_name} | Status: ${d.status}`);
          doc.moveDown(0.2);
        });
      }

      doc.moveDown(2);
      doc.fillColor('#9CA3AF').fontSize(9).text('Zero Food Waste Initiative • Powered by Food Rescue Application', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      logError(`Report generation failed: ${(error as Error).message}`);
      reject(error);
    }
  });
};
