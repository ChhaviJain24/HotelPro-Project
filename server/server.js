import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is missing. Copy .env.example to .env'); process.exit(1); }
const port = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`HotelPro API running on http://localhost:${port}`)))
  .catch((e) => { console.error('Could not connect to MongoDB:', e.message); process.exit(1); });
