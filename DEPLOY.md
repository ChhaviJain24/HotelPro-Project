# Putting HotelPro online (free tiers)

Database: MongoDB Atlas. API: Render (Web Service). Website: Netlify (or Vercel).

1. **GitHub.** Install Git, create an empty repository on github.com, then in the folder that contains `client` and `server`:
   `git init`, `git add .`, `git commit -m "HotelPro"`, `git branch -M main`, `git remote add origin <your repo URL>`, `git push -u origin main`.
   `.env` files are ignored by `.gitignore`, so your secrets are not uploaded.
2. **Atlas.** Network Access: allow `0.0.0.0/0` (Render's free IP addresses change). Keep your database user and the connection string ending in `/hotelpro_system`.
3. **Render (API).** New > Web Service > your repo. Root Directory `server`, Build Command `npm install`, Start Command `npm start`, Instance Type Free, Health Check Path `/api/health`.
   Environment variables: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (a NEW long random value), `CLIENT_URL` (the website URL from step 4, no trailing slash),
   `PAYMENT_MODE` (`mock` or `razorpay` + `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), and `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` (without email, password-reset links cannot be delivered in production).
   After deploy, open `https://YOUR-API.onrender.com/api/health`. It must show `{"ok":true}`.
4. **Netlify (website).** Add new site > Import from Git > your repo. Base directory `client`, Build command `npm run build`, Publish directory `dist` (if Netlify cannot find it, use `client/dist`).
   Environment variable: `VITE_API_URL` = your Render URL, no trailing slash. `client/public/_redirects` makes page refreshes work. For Vercel, set Root Directory to `client`; `client/vercel.json` does the same job.
5. **Back on Render:** set `CLIENT_URL` to the Netlify URL and save (it redeploys).
6. **First data.** On your computer, in `server`, run the seed once against the live database (PowerShell):
   `$env:MONGO_URI="your Atlas string"` then `npm run seed`, then `Remove-Item Env:MONGO_URI`. The seed wipes that database, so run it only once.
7. **Secure the demo accounts.** Register your own account on the live site, sign in as the demo admin, make your account an admin (Admin > Users and staff), sign in as yourself, then switch the three demo accounts off.
8. **Optional Razorpay webhook:** Dashboard > Webhooks: URL `https://YOUR-API.onrender.com/api/payments/razorpay/webhook`, events `payment.captured` and `order.paid`, and put the secret in `RAZORPAY_WEBHOOK_SECRET` on Render.

Known limits of the free setup
- The free API sleeps after 15 minutes without visits; the next visit takes about a minute to wake it.
- Photos uploaded by the admin are stored on the server disk, which Render's free plan wipes on every restart. Use cloud image storage (for example Cloudinary) before relying on uploaded photos.
- Real payments need Razorpay live keys, which need your business details approved.
