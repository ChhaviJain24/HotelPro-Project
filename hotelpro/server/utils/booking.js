import { Booking } from '../models/index.js';
export const holdMinutes = 15; // unpaid bookings hold a room for this long

// Rooms that overlap the requested dates (confirmed, checked-in, or a recent unpaid hold)
export async function busyRoomIds(checkIn, checkOut, excludeId) {
  const cutoff = new Date(Date.now() - holdMinutes * 60 * 1000);
  const f = { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn },
    $or: [{ status: { $in: ['Confirmed', 'Checked-in'] } }, { status: 'Pending', createdAt: { $gte: cutoff } }] };
  if (excludeId) f._id = { $ne: excludeId };
  return (await Booking.find(f).distinct('room')).map(String);
}

// Nightly price with seasonal overrides, plus tax
export function quote(room, checkIn, checkOut, taxRate = 0.12) {
  let subtotal = 0, nights = 0;
  for (const d = new Date(checkIn); d < checkOut; d.setUTCDate(d.getUTCDate() + 1)) {
    const s = room.seasonalPrices.find((p) => d >= p.from && d <= p.to);
    subtotal += s ? s.price : room.price; nights++;
  }
  const tax = Math.round(subtotal * taxRate);
  return { nights, subtotal, tax, total: subtotal + tax };
}
