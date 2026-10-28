// All HotelPro collections. Guests and Staff are Users with a role.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const { Schema, model } = mongoose;
const ref = (n) => ({ type: Schema.Types.ObjectId, ref: n });

const userSchema = new Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: [6, 'Password must be at least 6 characters'], select: false },
  phone: String,
  role: { type: String, enum: ['guest', 'staff', 'admin'], default: 'guest' },
  isActive: { type: Boolean, default: true },
  isWalkIn: { type: Boolean, default: false }, // created by the front desk
  passwordChangedAt: Date, // sessions issued before this are rejected
  resetTokenHash: { type: String, select: false }, resetTokenExpires: { type: Date, select: false },
}, { timestamps: true });
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
    if (!this.isNew) this.passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000 - 1000);
  }
});
userSchema.methods.matchPassword = function (p) { return bcrypt.compare(p, this.password); };
export const User = model('User', userSchema);

export const Hotel = model('Hotel', new Schema({
  name: { type: String, default: 'HotelPro Grand' }, address: String, city: String, phone: String, email: String,
  checkInTime: { type: String, default: '14:00' }, checkOutTime: { type: String, default: '11:00' },
  taxRate: { type: Number, default: 0.12 },
}, { timestamps: true }));

export const Room = model('Room', new Schema({
  hotel: ref('Hotel'),
  number: { type: String, required: [true, 'Room number is required'], unique: true },
  category: { type: String, enum: ['Standard', 'Deluxe', 'Suite', 'Family'], required: true },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  seasonalPrices: [{ label: String, from: Date, to: Date, price: Number }],
  capacity: { type: Number, default: 2, min: 1 },
  amenities: [String], images: [String], description: String,
  status: { type: String, enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance'], default: 'Available' },
  avgRating: { type: Number, default: 0 }, numReviews: { type: Number, default: 0 },
}, { timestamps: true }));

export const Booking = model('Booking', new Schema({
  guest: { ...ref('User'), required: true }, room: { ...ref('Room'), required: true },
  checkIn: { type: Date, required: true }, checkOut: { type: Date, required: true },
  guests: { type: Number, default: 1 }, specialRequests: String,
  nights: Number, subtotal: Number, tax: Number, amount: Number,
  status: { type: String, enum: ['Pending', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refund-requested', 'Refunded'], default: 'Unpaid' },
  checkedInAt: Date, checkedOutAt: Date, invoiceNo: String, reviewed: { type: Boolean, default: false },
  source: { type: String, enum: ['online', 'front-desk'], default: 'online' }, createdBy: ref('User'),
}, { timestamps: true }));

export const Payment = model('Payment', new Schema({
  booking: { ...ref('Booking'), required: true }, user: { ...ref('User'), required: true },
  amount: Number, method: String, transactionId: String,
  status: { type: String, enum: ['Success', 'Failed', 'Refunded'], default: 'Success' }, refundedAt: Date, refundId: String,
}, { timestamps: true }));

export const Review = model('Review', new Schema({
  booking: { ...ref('Booking'), unique: true }, room: ref('Room'), user: ref('User'),
  rating: { type: Number, min: 1, max: 5, required: true }, comment: String,
}, { timestamps: true }));

export const Notification = model('Notification', new Schema({
  user: { ...ref('User'), index: true }, title: String, message: String, read: { type: Boolean, default: false },
}, { timestamps: true }));

export const ServiceRequest = model('ServiceRequest', new Schema({
  type: { type: String, enum: ['Housekeeping', 'Maintenance', 'Room service', 'Support'], required: true },
  description: String, room: ref('Room'), booking: ref('Booking'), requestedBy: ref('User'), assignedTo: ref('User'),
  status: { type: String, enum: ['Open', 'In progress', 'Done'], default: 'Open' },
}, { timestamps: true }));

export const AdminLog = model('AdminLog', new Schema({ user: ref('User'), action: String, details: String }, { timestamps: true }));
