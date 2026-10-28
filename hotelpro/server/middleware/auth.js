import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ah, fail } from '../utils/helpers.js';

export const protect = ah(async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) fail(res, 401, 'Please sign in to continue');
  let decoded;
  try { decoded = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET); }
  catch { fail(res, 401, 'Your session has expired. Please sign in again'); }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) fail(res, 401, 'This account was not found or is disabled');
  if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) fail(res, 401, 'Your password was changed. Please sign in again');
  req.user = user; next();
});
export const authorize = (...roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) return next();
  res.status(403); next(new Error('You do not have permission to do this'));
};
