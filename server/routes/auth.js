import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { protect } from '../middleware/auth.js';
import { ah, fail, mail } from '../utils/helpers.js';
import { rateLimit } from '../middleware/rateLimit.js';
const r = Router();
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
const out = (u) => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });

r.post('/register', ah(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) fail(res, 400, 'Name, email and password are required');
  if (password.length < 6) fail(res, 400, 'Password must be at least 6 characters');
  if (await User.findOne({ email: email.toLowerCase() })) fail(res, 409, 'An account with this email already exists');
  const u = await User.create({ name, email, password, phone }); // role is always "guest" here
  res.status(201).json({ token: sign(u), user: out(u) });
}));

r.post('/login', ah(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) fail(res, 400, 'Email and password are required');
  const u = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!u || !(await u.matchPassword(password))) fail(res, 401, 'Incorrect email or password');
  if (!u.isActive) fail(res, 403, 'This account is disabled. Contact the hotel');
  res.json({ token: sign(u), user: out(u) });
}));

// Forgot password: emails a one-time link (valid 30 minutes). Same reply whether or not the email exists.
r.post('/forgot-password', rateLimit(5, 15 * 60 * 1000), ah(async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) fail(res, 400, 'Enter your email address');
  const u = await User.findOne({ email, isActive: true });
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    u.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex'); // only the hash is stored
    u.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await u.save({ validateBeforeSave: false });
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
    await mail(u.email, 'Reset your HotelPro password', `Hi ${u.name},\n\nUse this link to choose a new password. It works for 30 minutes:\n${link}\n\nIf you did not ask for this, you can ignore this email.`);
  }
  res.json({ message: 'If that email has an account, a reset link has been sent.' });
}));

r.post('/reset-password/:token', rateLimit(10, 15 * 60 * 1000), ah(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) fail(res, 400, 'Password must be at least 6 characters');
  const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const u = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
  if (!u) fail(res, 400, 'This reset link is invalid or has expired. Please request a new one');
  u.password = password; u.resetTokenHash = undefined; u.resetTokenExpires = undefined;
  await u.save(); // also signs out every older session
  res.json({ message: 'Password updated. You can now sign in.' });
}));

r.get('/me', protect, (req, res) => res.json(out(req.user)));

r.put('/me', protect, ah(async (req, res) => {
  const u = await User.findById(req.user._id).select('+password');
  const { name, phone, currentPassword, newPassword } = req.body;
  if (name) u.name = name;
  if (phone !== undefined) u.phone = phone;
  if (newPassword) {
    if (!currentPassword || !(await u.matchPassword(currentPassword))) fail(res, 400, 'Current password is incorrect');
    if (newPassword.length < 6) fail(res, 400, 'New password must be at least 6 characters');
    u.password = newPassword;
  }
  await u.save();
  res.json({ ...out(u), token: newPassword ? sign(u) : undefined }); // fresh token, since a password change ends old sessions
}));
export default r;
