import { Router } from 'express';
import crypto from 'crypto';
import { Booking, Room, Hotel, Payment, ServiceRequest, User } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah, fail, notify, logAction } from '../utils/helpers.js';
import { busyRoomIds, quote } from '../utils/booking.js';
import { refund } from '../services/gateway.js';
const r = Router();
r.use(protect);
const staffRoles = ['staff', 'admin'];
const full = (q) => q.populate('room', 'number category images price').populate('guest', 'name email phone');
async function mine(req, res) { // owner, or staff/admin
  const b = await full(Booking.findById(req.params.id));
  if (!b) fail(res, 404, 'Booking not found');
  if (req.user.role === 'guest' && String(b.guest._id) !== String(req.user._id)) fail(res, 403, 'This is not your booking');
  return b;
}

// Guest: reserve a room (held 15 minutes until paid)
r.post('/', authorize('guest'), ah(async (req, res) => {
  const { roomId, checkIn, checkOut, guests = 1, specialRequests } = req.body;
  const ci = new Date(checkIn), co = new Date(checkOut);
  if (isNaN(ci) || isNaN(co) || co <= ci) fail(res, 400, 'Choose a valid check-in and check-out date');
  if (ci < new Date(new Date().toISOString().slice(0, 10))) fail(res, 400, 'Check-in cannot be in the past');
  const room = await Room.findById(roomId);
  if (!room) fail(res, 404, 'Room not found');
  if (room.status === 'Maintenance') fail(res, 400, 'This room is not bookable right now');
  if (guests > room.capacity) fail(res, 400, `This room sleeps up to ${room.capacity} guests`);
  if ((await busyRoomIds(ci, co)).includes(String(room._id))) fail(res, 409, 'This room is booked for those dates. Pick other dates or another room');
  const hotel = await Hotel.findOne();
  const q = quote(room, ci, co, hotel?.taxRate ?? 0.12);
  const b = await Booking.create({ guest: req.user._id, room: room._id, checkIn: ci, checkOut: co, guests, specialRequests,
    nights: q.nights, subtotal: q.subtotal, tax: q.tax, amount: q.total });
  res.status(201).json(b);
}));

// ---- Front desk: walk-in bookings
r.get('/guest-search', authorize(...staffRoles), ah(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  res.json(await User.find({ role: 'guest', isActive: true, $or: [{ name: rx }, { email: rx }, { phone: rx }] }).select('name email phone').limit(8));
}));
r.get('/quote', authorize(...staffRoles), ah(async (req, res) => {
  const ci = new Date(req.query.checkIn), co = new Date(req.query.checkOut);
  if (isNaN(ci) || isNaN(co) || co <= ci) fail(res, 400, 'Choose a valid check-in and check-out date');
  const room = await Room.findById(req.query.roomId);
  if (!room) fail(res, 404, 'Room not found');
  res.json(quote(room, ci, co, (await Hotel.findOne())?.taxRate ?? 0.12));
}));
// Staff books for a guest at the desk and collects payment there. Optionally checks them in at once.
r.post('/walk-in', authorize(...staffRoles), ah(async (req, res) => {
  const { guest = {}, roomId, checkIn, checkOut, guests = 1, method = 'Cash', checkInNow = false, specialRequests } = req.body;
  if (!['Cash', 'Card', 'UPI'].includes(method)) fail(res, 400, 'Choose Cash, Card or UPI');
  const ci = new Date(checkIn), co = new Date(checkOut);
  if (isNaN(ci) || isNaN(co) || co <= ci) fail(res, 400, 'Choose a valid check-in and check-out date');
  const todayUTC = new Date(new Date().toISOString().slice(0, 10)); // one day of tolerance for time zones
  if (ci < new Date(todayUTC - 864e5)) fail(res, 400, 'Check-in cannot be in the past');
  const room = await Room.findById(roomId);
  if (!room) fail(res, 404, 'Room not found');
  if (room.status === 'Maintenance') fail(res, 400, `Room ${room.number} is under maintenance`);
  if (guests > room.capacity) fail(res, 400, `This room sleeps up to ${room.capacity} guests`);
  if ((await busyRoomIds(ci, co)).includes(String(room._id))) fail(res, 409, 'This room is booked for those dates. Pick another room');
  if (checkInNow) {
    if (ci - todayUTC > 864e5) fail(res, 400, 'Only a stay that starts today can be checked in now');
    if (room.status !== 'Available') fail(res, 400, `Room ${room.number} is ${room.status.toLowerCase()} and not ready for check-in`);
  }
  // existing guest (picked from search, or matched by email) or a new walk-in guest
  let user;
  if (guest.id) user = await User.findOne({ _id: guest.id, role: 'guest', isActive: true });
  else {
    const name = (guest.name || '').trim(), phone = (guest.phone || '').trim(), email = (guest.email || '').trim().toLowerCase();
    if (!name || !phone) fail(res, 400, "Enter the guest's name and phone number");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) fail(res, 400, 'That email address does not look right');
    user = email ? await User.findOne({ email }) : null;
    if (user && user.role !== 'guest') fail(res, 400, 'That email belongs to a staff account');
    if (user && !user.isActive) fail(res, 400, 'That guest account is disabled');
    // no email: a placeholder keeps the record valid; the guest never gets emails there
    if (!user) user = await User.create({ name, phone, role: 'guest', isWalkIn: true, password: crypto.randomBytes(12).toString('hex'),
      email: email || `walkin-${Date.now()}-${Math.floor(Math.random() * 1000)}@hotelpro.local` });
  }
  if (!user) fail(res, 404, 'Guest not found');
  const qt = quote(room, ci, co, (await Hotel.findOne())?.taxRate ?? 0.12);
  const b = await Booking.create({ guest: user._id, room: room._id, checkIn: ci, checkOut: co, guests, specialRequests,
    nights: qt.nights, subtotal: qt.subtotal, tax: qt.tax, amount: qt.total, source: 'front-desk', createdBy: req.user._id,
    status: checkInNow ? 'Checked-in' : 'Confirmed', paymentStatus: 'Paid', checkedInAt: checkInNow ? new Date() : undefined });
  await Payment.create({ booking: b._id, user: user._id, amount: qt.total, method: 'Desk: ' + method, transactionId: 'DESK' + Date.now(), status: 'Success' });
  if (checkInNow) await Room.findByIdAndUpdate(room._id, { status: 'Occupied' });
  await notify(user, 'Booking confirmed', `Room ${room.number} (${room.category}) is booked at the front desk. Total ${qt.total}.`, true);
  res.status(201).json(await full(Booking.findById(b._id)));
}));

r.get('/mine', ah(async (req, res) => res.json(await full(Booking.find({ guest: req.user._id }).sort('-createdAt')))));

// Staff/admin: all reservations
r.get('/', authorize(...staffRoles), ah(async (req, res) => {
  const f = {};
  if (req.query.status) f.status = { $in: req.query.status.split(',') };
  res.json(await full(Booking.find(f).sort('-createdAt').limit(300)));
}));

r.get('/:id', ah(async (req, res) => res.json(await mine(req, res))));

r.get('/:id/invoice', ah(async (req, res) => {
  const b = await mine(req, res);
  if (b.paymentStatus === 'Unpaid') fail(res, 400, 'No invoice until the booking is paid');
  const hotel = await Hotel.findOne().lean();
  res.json({ invoiceNo: b.invoiceNo || 'INV-' + String(b._id).slice(-6).toUpperCase(), hotel, booking: b });
}));

// Cancel. Paid bookings go to "Refund-requested" for admin approval.
r.put('/:id/cancel', ah(async (req, res) => {
  const b = await mine(req, res);
  if (['Checked-in', 'Checked-out', 'Cancelled'].includes(b.status)) fail(res, 400, `A ${b.status.toLowerCase()} booking cannot be cancelled`);
  b.status = 'Cancelled';
  if (b.paymentStatus === 'Paid') b.paymentStatus = 'Refund-requested';
  await b.save();
  await notify(b.guest, 'Booking cancelled', `Booking for room ${b.room.number} was cancelled.` + (b.paymentStatus === 'Refund-requested' ? ' Your refund is awaiting approval.' : ''), true);
  if (b.paymentStatus === 'Refund-requested') { // tell every admin there is a refund to approve
    const admins = await User.find({ role: 'admin', isActive: true });
    await Promise.all(admins.map((a) => notify(a, 'Refund request', `${b.guest.name} cancelled room ${b.room.number}. A refund of ${b.amount} is waiting for your approval.`, true)));
  }
  res.json(b);
}));

// Staff: check-in and check-out
r.put('/:id/checkin', authorize(...staffRoles), ah(async (req, res) => {
  const b = await mine(req, res);
  if (b.status !== 'Confirmed') fail(res, 400, 'Only confirmed (paid) bookings can be checked in');
  b.status = 'Checked-in'; b.checkedInAt = new Date(); await b.save();
  await Room.findByIdAndUpdate(b.room._id, { status: 'Occupied' });
  await notify(b.guest, 'Welcome!', `You are checked in to room ${b.room.number}. Enjoy your stay.`);
  res.json(b);
}));
r.put('/:id/checkout', authorize(...staffRoles), ah(async (req, res) => {
  const b = await mine(req, res);
  if (b.status !== 'Checked-in') fail(res, 400, 'Only checked-in guests can be checked out');
  b.status = 'Checked-out'; b.checkedOutAt = new Date(); b.invoiceNo = 'INV-' + String(b._id).slice(-6).toUpperCase(); await b.save();
  await Room.findByIdAndUpdate(b.room._id, { status: 'Cleaning' });
  await ServiceRequest.create({ type: 'Housekeeping', description: `Clean room ${b.room.number} after checkout`, room: b.room._id, booking: b._id, requestedBy: req.user._id });
  await notify(b.guest, 'Thanks for staying with us', `Invoice ${b.invoiceNo}: total ${b.amount}. Please rate your stay.`, true);
  res.json(b);
}));

// Admin: modify dates or room, approve refund
r.put('/:id', authorize('admin'), ah(async (req, res) => {
  const b = await mine(req, res);
  if (!['Pending', 'Confirmed'].includes(b.status)) fail(res, 400, 'Only upcoming bookings can be modified');
  const ci = new Date(req.body.checkIn || b.checkIn), co = new Date(req.body.checkOut || b.checkOut);
  const room = await Room.findById(req.body.roomId || b.room._id);
  if (co <= ci) fail(res, 400, 'Check-out must be after check-in');
  if ((await busyRoomIds(ci, co, b._id)).includes(String(room._id))) fail(res, 409, 'Room is not available for those dates');
  const q = quote(room, ci, co, (await Hotel.findOne())?.taxRate ?? 0.12);
  Object.assign(b, { checkIn: ci, checkOut: co, room: room._id, nights: q.nights, subtotal: q.subtotal, tax: q.tax });
  if (b.paymentStatus === 'Unpaid') b.amount = q.total;
  await b.save();
  await logAction(req.user, 'Booking modified', String(b._id));
  await notify(b.guest, 'Booking updated', 'Your booking dates or room were changed by the hotel.', true);
  res.json(await full(Booking.findById(b._id)));
}));
r.put('/:id/refund', authorize('admin'), ah(async (req, res) => {
  const b = await mine(req, res);
  if (b.paymentStatus !== 'Refund-requested') fail(res, 400, 'No refund is pending for this booking');
  const p = await Payment.findOne({ booking: b._id, status: 'Success' });
  let result = { via: 'manual', note: 'No payment record was found, so nothing was sent to a payment gateway.' };
  if (p) {
    try { result = await refund(p); } catch (e) { fail(res, 502, 'The refund was not sent. ' + e.message); } // booking stays "Refund-requested"
    p.status = 'Refunded'; p.refundedAt = new Date(); if (result.refundId) p.refundId = result.refundId; await p.save();
  }
  b.paymentStatus = 'Refunded'; await b.save();
  const message = result.via === 'razorpay'
    ? (result.refundId ? `Refund ${result.refundId} sent through Razorpay. The guest receives it in about 5 to 7 working days.` : result.note)
    : 'Marked as refunded. ' + result.note;
  await logAction(req.user, 'Refund approved', `Booking ${b._id}: ${message}`);
  await notify(b.guest, 'Refund approved', `Your refund of ${b.amount} has been approved.`, true);
  res.json({ booking: b, message });
}));
export default r;
