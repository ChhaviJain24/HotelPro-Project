import { Router } from 'express';
import { Booking, Payment, User } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah, fail, notify } from '../utils/helpers.js';
import { busyRoomIds } from '../utils/booking.js';
import * as gw from '../services/gateway.js';
const r = Router();

// Marks a booking paid (safe to call twice for the same payment). If the room was taken in the
// meantime, the booking is cancelled and a refund request is raised for the admin instead.
async function confirmPaid(b, { method, transactionId, userId }) {
  const existing = await Payment.findOne({ transactionId });
  if (existing) return { payment: existing };
  const payment = await Payment.create({ booking: b._id, user: userId, amount: b.amount, method, transactionId });
  const guest = await User.findById(userId);
  const roomId = String(b.room._id ?? b.room);
  if ((await busyRoomIds(b.checkIn, b.checkOut, b._id)).includes(roomId)) {
    b.status = 'Cancelled'; b.paymentStatus = 'Refund-requested'; await b.save();
    for (const a of await User.find({ role: 'admin', isActive: true }))
      await notify(a, 'Refund needed', `A payment of ${b.amount} arrived but room ${b.room.number ?? ''} was already taken. Please approve the refund.`, true);
    await notify(guest, 'Booking could not be confirmed', 'The room was taken before your payment completed. Your refund has been requested.', true);
    return { payment, clash: true };
  }
  b.status = 'Confirmed'; b.paymentStatus = 'Paid'; await b.save();
  await notify(guest, 'Booking confirmed', `Room ${b.room.number} (${b.room.category}) is confirmed. Payment ${transactionId}, total ${b.amount}.`, true);
  return { payment };
}

// Razorpay calls this by itself (no login). Needs a public URL, so it works once the site is online.
r.post('/razorpay/webhook', ah(async (req, res) => {
  if (!gw.verifyWebhook(req.rawBody, req.headers['x-razorpay-signature'])) fail(res, 400, 'Invalid webhook signature');
  const pay = req.body.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(req.body.event) && pay?.notes?.bookingId) {
    const b = await Booking.findById(pay.notes.bookingId).populate('room', 'number category');
    if (b && b.status === 'Pending' && pay.amount === Math.round(b.amount * 100))
      await confirmPaid(b, { method: 'Razorpay', transactionId: pay.id, userId: b.guest });
  }
  res.json({ ok: true });
}));

r.use(protect);
r.get('/config', (req, res) => res.json({ mode: gw.isRazorpay() ? 'razorpay' : 'mock', keyId: gw.isRazorpay() ? process.env.RAZORPAY_KEY_ID : undefined }));

const pendingBooking = async (req, res, id) => {
  const b = await Booking.findOne({ _id: id, guest: req.user._id }).populate('room', 'number category');
  if (!b) fail(res, 404, 'Booking not found');
  return b;
};

// Razorpay step 1: create an order for this booking
r.post('/razorpay/order', authorize('guest'), ah(async (req, res) => {
  if (!gw.isRazorpay()) fail(res, 400, 'Online payments are not switched on');
  const b = await pendingBooking(req, res, req.body.bookingId);
  if (b.status !== 'Pending') fail(res, 400, 'This booking is not waiting for payment');
  if ((await busyRoomIds(b.checkIn, b.checkOut, b._id)).includes(String(b.room._id))) fail(res, 409, 'Your hold expired and the room was booked by someone else');
  const order = await gw.createOrder({ amount: b.amount, receipt: String(b._id), notes: { bookingId: String(b._id) } });
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
}));

// Razorpay step 2: the browser reports the payment; we verify it before confirming anything
r.post('/razorpay/verify', authorize('guest'), ah(async (req, res) => {
  const { bookingId, razorpay_order_id: orderId, razorpay_payment_id: payId, razorpay_signature: sig } = req.body;
  if (!gw.verifySignature(orderId, payId, sig)) fail(res, 400, 'Payment could not be verified. If money was deducted, contact the hotel');
  const b = await pendingBooking(req, res, bookingId);
  if (await Payment.exists({ transactionId: payId })) return res.json({ ok: true }); // already confirmed (for example by the webhook)
  // the order must belong to this booking and match its price, or a cheap payment could unlock a dearer booking
  const order = await gw.getOrder(orderId);
  if (order.receipt !== String(b._id) || order.amount !== Math.round(b.amount * 100)) fail(res, 400, 'This payment does not match the booking');
  if (b.status !== 'Pending') fail(res, 400, 'This booking is not waiting for payment');
  const result = await confirmPaid(b, { method: 'Razorpay', transactionId: payId, userId: req.user._id });
  if (result.clash) fail(res, 409, 'Payment received, but the room was taken just before. A refund has been requested automatically');
  res.status(201).json({ ok: true });
}));

// Simulated payment (PAYMENT_MODE=mock only)
r.post('/', authorize('guest'), ah(async (req, res) => {
  if (gw.isRazorpay()) fail(res, 400, 'Use the online payment window to pay');
  const { bookingId, method = 'UPI' } = req.body;
  const b = await pendingBooking(req, res, bookingId);
  if (b.status !== 'Pending' || b.paymentStatus === 'Paid') fail(res, 400, 'This booking is not waiting for payment');
  if ((await busyRoomIds(b.checkIn, b.checkOut, b._id)).includes(String(b.room._id))) fail(res, 409, 'Your hold expired and the room was booked by someone else');
  const result = await gw.charge({ amount: b.amount, method });
  if (!result.success) fail(res, 402, 'Payment failed. Try another method');
  const { payment } = await confirmPaid(b, { method, transactionId: result.transactionId, userId: req.user._id });
  res.status(201).json({ payment, booking: b });
}));

r.get('/mine', ah(async (req, res) => res.json(await Payment.find({ user: req.user._id }).sort('-createdAt'))));
r.get('/', authorize('admin'), ah(async (req, res) =>
  res.json(await Payment.find().populate('user', 'name email').populate({ path: 'booking', select: 'room', populate: { path: 'room', select: 'number' } }).sort('-createdAt').limit(300))));
export default r;
