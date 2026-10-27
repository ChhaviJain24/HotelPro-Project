import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { Room, Review, Booking } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah, fail, logAction } from '../utils/helpers.js';
import { busyRoomIds } from '../utils/booking.js';
const r = Router();

const upload = multer({
  storage: multer.diskStorage({ destination: 'uploads/', filename: (q, f, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(f.originalname)) }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (q, f, cb) => cb(f.mimetype.startsWith('image/') ? null : new Error('Only image files are allowed'), f.mimetype.startsWith('image/')),
});
const fields = ['number', 'category', 'price', 'seasonalPrices', 'capacity', 'amenities', 'description', 'status'];
const pick = (b) => Object.fromEntries(fields.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]));

// Public: browse and search. With dates, each room gets an "available" flag.
r.get('/', ah(async (req, res) => {
  const { checkIn, checkOut, guests, category, minPrice, maxPrice } = req.query, f = {};
  if (category) f.category = category;
  if (guests) f.capacity = { $gte: +guests };
  if (minPrice || maxPrice) f.price = { ...(minPrice && { $gte: +minPrice }), ...(maxPrice && { $lte: +maxPrice }) };
  let rooms = await Room.find(f).sort('price').lean();
  if (checkIn && checkOut) {
    const busy = await busyRoomIds(new Date(checkIn), new Date(checkOut));
    rooms = rooms.map((x) => ({ ...x, available: !busy.includes(String(x._id)) && x.status !== 'Maintenance' }));
  }
  res.json(rooms);
}));

r.get('/:id', ah(async (req, res) => {
  const room = await Room.findById(req.params.id).lean();
  if (!room) fail(res, 404, 'Room not found');
  const reviews = await Review.find({ room: room._id }).populate('user', 'name').sort('-createdAt').limit(20);
  res.json({ ...room, reviews });
}));

// Admin: inventory and pricing
r.post('/', protect, authorize('admin'), ah(async (req, res) => {
  const room = await Room.create(pick(req.body));
  await logAction(req.user, 'Room created', `Room ${room.number}`);
  res.status(201).json(room);
}));
r.put('/:id', protect, authorize('admin'), ah(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  if (!room) fail(res, 404, 'Room not found');
  await logAction(req.user, 'Room updated', `Room ${room.number}`);
  res.json(room);
}));
r.delete('/:id', protect, authorize('admin'), ah(async (req, res) => {
  const active = await Booking.exists({ room: req.params.id, status: { $in: ['Pending', 'Confirmed', 'Checked-in'] } });
  if (active) fail(res, 400, 'This room has active bookings. Cancel them first');
  const room = await Room.findByIdAndDelete(req.params.id);
  if (!room) fail(res, 404, 'Room not found');
  await logAction(req.user, 'Room deleted', `Room ${room.number}`);
  res.json({ message: 'Room deleted' });
}));
r.post('/:id/images', protect, authorize('admin'), upload.array('images', 5), ah(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) fail(res, 404, 'Room not found');
  room.images.push(...req.files.map((f) => '/uploads/' + f.filename));
  await room.save();
  res.json(room);
}));

// Staff and admin: live room status (housekeeping, maintenance)
r.put('/:id/status', protect, authorize('staff', 'admin'), ah(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!room) fail(res, 404, 'Room not found');
  res.json(room);
}));
export default r;
