// Run: npm run seed   (wipes the database, then creates demo users, hotel and rooms)
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { User, Hotel, Room, Booking, Payment, Review, Notification, ServiceRequest, AdminLog } from './models/index.js';

async function run() {
  await connectDB();
  await Promise.all([User, Hotel, Room, Booking, Payment, Review, Notification, ServiceRequest, AdminLog].map((m) => m.deleteMany()));
  await User.create([
    { name: 'Admin', email: 'admin@hotelpro.com', password: 'Admin@123', role: 'admin' },
    { name: 'Front Desk', email: 'staff@hotelpro.com', password: 'Staff@123', role: 'staff' },
    { name: 'Priya Verma', email: 'guest@hotelpro.com', password: 'Guest@123', role: 'guest', phone: '9999900000' },
  ]);
  const hotel = await Hotel.create({ name: 'HotelPro Grand', address: '12 Palasia Square', city: 'Indore', phone: '+91 731 000 0000', email: 'hello@hotelpro.com' });
  const y = new Date().getFullYear();
  const peak = [{ label: 'Winter peak', from: new Date(`${y}-12-20`), to: new Date(`${y + 1}-01-05`) }];
  const defs = [['Standard', 2499, 2, ['Wi-Fi', 'AC', 'TV', 'Breakfast']], ['Deluxe', 3999, 2, ['Wi-Fi', 'AC', 'Smart TV', 'Breakfast', 'Minibar']],
    ['Suite', 7499, 3, ['Wi-Fi', 'AC', 'Jacuzzi', 'Lounge', 'Breakfast']], ['Family', 5499, 5, ['Wi-Fi', 'AC', 'Extra beds', 'Breakfast', 'Kitchenette']]];
  const rooms = [];
  defs.forEach(([category, price, capacity, amenities], i) => {
    for (let k = 1; k <= 3; k++) rooms.push({ hotel: hotel._id, number: String((i + 1) * 100 + k), category, price: price + (k - 1) * 300, capacity, amenities,
      description: `A comfortable ${category.toLowerCase()} room on floor ${i + 1}.`, seasonalPrices: category === 'Standard' ? [] : peak.map((p) => ({ ...p, price: Math.round(price * 1.3) })) });
  });
  await Room.create(rooms);
  console.log('Seeded. Sign in with:\n  admin@hotelpro.com / Admin@123\n  staff@hotelpro.com / Staff@123\n  guest@hotelpro.com / Guest@123');
  await mongoose.disconnect();
}
run().then(() => process.exit(0)).catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
