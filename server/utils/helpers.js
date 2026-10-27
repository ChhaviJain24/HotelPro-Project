import nodemailer from 'nodemailer';
import { Notification, AdminLog } from '../models/index.js';

export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const fail = (res, code, message) => { res.status(code); throw new Error(message); };

let tx;
export async function mail(to, subject, text) {
  if (!process.env.EMAIL_USER) return console.log(`[email not configured] to ${to}: ${subject}` + (process.env.NODE_ENV !== 'production' ? `\n${text}\n` : ''));
  try {
    tx ??= nodemailer.createTransport({ host: process.env.EMAIL_HOST, port: +(process.env.EMAIL_PORT || 587),
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await tx.sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to, subject, text });
  } catch (e) { console.error('Email failed:', e.message); }
}
// In-app notification, optionally also emailed
export async function notify(user, title, message, email = false) {
  await Notification.create({ user: user._id, title, message });
  if (email && user.email && !user.email.endsWith('@hotelpro.local')) await mail(user.email, title, message);
}
export const logAction = (user, action, details = '') => AdminLog.create({ user: user._id, action, details });
