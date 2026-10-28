import { Router } from 'express';
import { Review, Booking, Room, Notification, ServiceRequest, Hotel } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah, fail, logAction } from '../utils/helpers.js';

// ---- Reviews
export const reviews = Router();
reviews.post('/', protect, authorize('guest'), ah(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const b = await Booking.findOne({ _id: bookingId, guest: req.user._id });
  if (!b) fail(res, 404, 'Booking not found');
  if (b.status !== 'Checked-out') fail(res, 400, 'You can review a stay after check-out');
  if (b.reviewed) fail(res, 409, 'You already reviewed this stay');
  if (!(rating >= 1 && rating <= 5)) fail(res, 400, 'Rating must be 1 to 5');
  const rv = await Review.create({ booking: b._id, room: b.room, user: req.user._id, rating, comment });
  b.reviewed = true; await b.save();
  const [agg] = await Review.aggregate([{ $match: { room: b.room } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Room.findByIdAndUpdate(b.room, { avgRating: Math.round(agg.avg * 10) / 10, numReviews: agg.n });
  res.status(201).json(rv);
}));

// ---- Notifications
export const notifications = Router();
notifications.use(protect);
notifications.get('/', ah(async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50))));
notifications.get('/unread-count', ah(async (req, res) => res.json({ count: await Notification.countDocuments({ user: req.user._id, read: false }) })));
notifications.put('/read-all', ah(async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: true }); }));
notifications.put('/:id/read', ah(async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true }); res.json({ ok: true }); }));

// ---- Service requests (housekeeping, maintenance, room service, support)
export const services = Router();
services.use(protect);
services.post('/', ah(async (req, res) => {
  const { type, description, roomId } = req.body;
  if (!type) fail(res, 400, 'Choose a request type');
  let room = roomId || undefined, booking;
  if (req.user.role === 'guest') { // guests can only ask from a room they are staying in
    booking = await Booking.findOne({ guest: req.user._id, status: 'Checked-in' });
    if (!booking) fail(res, 400, 'You can send service requests while checked in');
    room = booking.room;
  }
  res.status(201).json(await ServiceRequest.create({ type, description, room, booking: booking?._id, requestedBy: req.user._id }));
}));
services.get('/', ah(async (req, res) => {
  const f = req.user.role === 'guest' ? { requestedBy: req.user._id } : {};
  res.json(await ServiceRequest.find(f).populate('room', 'number').populate('requestedBy', 'name role').populate('assignedTo', 'name').sort('-createdAt').limit(200));
}));
services.put('/:id', authorize('staff', 'admin'), ah(async (req, res) => {
  const s = await ServiceRequest.findById(req.params.id);
  if (!s) fail(res, 404, 'Request not found');
  if (req.body.status) s.status = req.body.status;
  if (req.body.assignedTo !== undefined) s.assignedTo = req.body.assignedTo || undefined;
  await s.save();
  if (s.type === 'Housekeeping' && s.status === 'Done' && s.room) await Room.updateOne({ _id: s.room, status: 'Cleaning' }, { status: 'Available' });
  res.json(s);
}));

// ---- Hotel settings (platform configuration)
export const hotel = Router();
hotel.get('/', ah(async (req, res) => res.json((await Hotel.findOne()) || {})));
hotel.put('/', protect, authorize('admin'), ah(async (req, res) => {
  const h = (await Hotel.findOne()) || new Hotel();
  Object.assign(h, req.body); await h.save();
  await logAction(req.user, 'Hotel settings updated');
  res.json(h);
}));
