import { Router } from 'express';
import { User, Room, Booking, Payment, AdminLog } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah, fail, logAction } from '../utils/helpers.js';
const r = Router();
r.use(protect, authorize('admin'));

r.get('/stats', ah(async (req, res) => {
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1);
  const [rooms, occupied, byStatus, revenue, monthly, byCategory, users, refundsPending] = await Promise.all([
    Room.countDocuments(), Room.countDocuments({ status: 'Occupied' }),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'Success' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'Success', createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
    Payment.aggregate([{ $match: { status: 'Success' } },
      { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'b' } }, { $unwind: '$b' },
      { $lookup: { from: 'rooms', localField: 'b.room', foreignField: '_id', as: 'r' } }, { $unwind: '$r' },
      { $group: { _id: '$r.category', revenue: { $sum: '$amount' } } }]),
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    Booking.countDocuments({ paymentStatus: 'Refund-requested' }),
  ]);
  res.json({ refundsPending, rooms, occupied, occupancy: rooms ? Math.round((occupied / rooms) * 100) : 0,
    revenue: revenue[0]?.t || 0,
    bookingsByStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.n])),
    monthly: monthly.map((m) => ({ month: m._id, revenue: m.revenue })),
    byCategory: byCategory.map((c) => ({ category: c._id, revenue: c.revenue })),
    users: Object.fromEntries(users.map((x) => [x._id, x.n])) });
}));

r.get('/users', ah(async (req, res) => res.json(await User.find(req.query.role ? { role: req.query.role } : {}).sort('-createdAt'))));
r.post('/staff', ah(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) fail(res, 400, 'Name, email and password are required');
  if (await User.findOne({ email: email.toLowerCase() })) fail(res, 409, 'An account with this email already exists');
  const u = await User.create({ name, email, password, phone, role: 'staff' });
  await logAction(req.user, 'Staff account created', email);
  res.status(201).json(u);
}));
r.put('/users/:id', ah(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) fail(res, 400, 'You cannot change your own role or status');
  const u = await User.findById(req.params.id);
  if (!u) fail(res, 404, 'User not found');
  if (req.body.role) u.role = req.body.role;
  if (req.body.isActive !== undefined) u.isActive = req.body.isActive;
  await u.save();
  await logAction(req.user, 'User updated', `${u.email}: role ${u.role}, active ${u.isActive}`);
  res.json(u);
}));
r.get('/logs', ah(async (req, res) => res.json(await AdminLog.find().populate('user', 'name').sort('-createdAt').limit(100))));
export default r;
