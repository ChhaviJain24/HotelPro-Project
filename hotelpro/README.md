# HotelPro – Hotel Management System (MERN)

Guests search, book and pay for rooms. Staff run check-in, check-out, room status and housekeeping. Admins manage rooms, pricing, staff, payments, refunds, reports and security.

**Stack:** MongoDB, Express, React (Vite), Node.js · JWT auth, bcrypt, role-based access (guest, staff, admin) · Redux Toolkit, React Router, Axios, Bootstrap 5, react-toastify, Recharts · Multer uploads, Nodemailer emails.

## Requirements
Node.js 18+ (server runs on 16.20+), npm 8+, MongoDB running locally (or an Atlas URI).

## Run it
`server/.env` is already created. If you use MongoDB Atlas instead of a local MongoDB, replace the `MONGO_URI` line in it with your Atlas string and keep the database name `hotelpro_system`.
```bash
# Terminal 1: API
cd server
npm install
npm run seed              # demo users, hotel and 12 rooms (prints the logins)
npm run dev               # http://localhost:5000

# Terminal 2: website
cd client
npm install
npm run dev               # http://localhost:5173
```

Demo sign-ins after seeding:

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@hotelpro.com  | Admin@123 |
| Staff | staff@hotelpro.com  | Staff@123 |
| Guest | guest@hotelpro.com  | Guest@123 |

## The flow
1. **Guest** registers, searches rooms by dates, guests, type and price (availability is checked against existing bookings).
2. Reserving creates a **Pending** booking that holds the room for 15 minutes. Price = nightly rate (with seasonal overrides) + GST.
3. **Payment** confirms the booking, records a Payment, sends an in-app notification and an email.
4. **Staff** checks the guest in (room becomes Occupied) and out (room becomes Cleaning, a housekeeping task is created, invoice emailed). Marking housekeeping Done frees the room.
5. **Guest** can cancel (paid bookings become a refund request), view and print the invoice, send service requests while checked in, and review a finished stay.
6. **Admin** approves refunds, changes booking dates, manages rooms, seasonal prices and photos, staff accounts, hotel settings (GST), and sees revenue and occupancy charts plus an admin action log.

## API (all under /api)
| Area | Endpoints |
|------|-----------|
| auth | POST register, POST login, GET/PUT me |
| rooms | GET / (public search), GET /:id, POST, PUT /:id, DELETE /:id, POST /:id/images (admin), PUT /:id/status (staff) |
| bookings | POST / (guest), GET /mine, GET / (staff), GET /:id, GET /:id/invoice, PUT /:id/cancel, PUT /:id/checkin, PUT /:id/checkout, PUT /:id (admin), PUT /:id/refund (admin) |
| payments | POST / (guest), GET /mine, GET / (admin) |
| reviews, notifications, services, hotel | see server/routes/misc.js |
| admin | GET stats, users, logs · POST staff · PUT users/:id |

## Before going live
- **Payments are simulated** (`PAYMENT_MODE=mock`). Implement Stripe or Razorpay in `server/services/gateway.js`, and confirm payments by webhook before marking a booking Paid.
- Set a strong `JWT_SECRET`, `NODE_ENV=production`, and restrict `CLIENT_URL`.
- Add rate limiting and `helmet`, store room images in cloud storage, and put the API behind HTTPS.
- Add automated tests; the code was syntax-checked and the client builds, but you should run the full flow against your database.

## Images
Room, hero and favicon pictures are illustrations in `client/public/images/` (`rooms/standard.svg`, `deluxe.svg`, `suite.svg`, `family.svg`, `hero.svg`). Admins can upload real photos per room (Admin > Rooms and pricing > Edit); an uploaded photo replaces the illustration for that room. To use real photos for every room type, add `.jpg` files and change the extension in `roomImage()` in `client/src/utils.jsx` and in `Home.jsx`.
