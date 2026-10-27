// Simple in-memory limiter (per IP and route). For several servers, use a shared store such as Redis.
const hits = new Map();
export const rateLimit = (max, windowMs) => (req, res, next) => {
  const key = req.ip + req.baseUrl + req.path, now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { res.status(429); return next(new Error('Too many attempts. Please try again in a few minutes')); }
  recent.push(now); hits.set(key, recent); next();
};
