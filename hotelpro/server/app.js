import express from 'express';
import cors from 'cors';
import path from 'path';
import auth from './routes/auth.js';
import rooms from './routes/rooms.js';
import bookings from './routes/bookings.js';
import payments from './routes/payments.js';
import admin from './routes/admin.js';
import { reviews, notifications, services, hotel } from './routes/misc.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
app.set('trust proxy', 1); // behind Render's proxy: real visitor IPs, so the rate limiter works per person
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '') }));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })); // raw body is needed to check webhook signatures
app.use('/uploads', express.static(path.resolve('uploads')));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/rooms', rooms);
app.use('/api/bookings', bookings);
app.use('/api/payments', payments);
app.use('/api/reviews', reviews);
app.use('/api/notifications', notifications);
app.use('/api/services', services);
app.use('/api/hotel', hotel);
app.use('/api/admin', admin);
app.use(notFound);
app.use(errorHandler);
export default app;
