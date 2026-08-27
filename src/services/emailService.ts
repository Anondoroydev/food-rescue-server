import nodemailer from 'nodemailer';
import { logInfo, logError } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  auth: {
    user: process.env.SMTP_USER || 'testuser',
    pass: process.env.SMTP_PASS || 'testpass'
  }
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'FoodRescue Platform'}" <${process.env.FROM_EMAIL || 'no-reply@foodrescue.com'}>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    logInfo(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    logError(`Failed to send email to ${to}: ${(error as Error).message}`);
    return false;
  }
};
