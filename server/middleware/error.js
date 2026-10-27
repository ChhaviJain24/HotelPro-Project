export const notFound = (req, res, next) => { res.status(404); next(new Error(`Route not found: ${req.originalUrl}`)); };
export const errorHandler = (err, req, res, next) => {
  let code = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500, message = err.message;
  if (err.name === 'ValidationError') { code = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  if (err.name === 'CastError') { code = 404; message = 'Record not found'; }
  if (err.code === 11000) { code = 409; message = `Already exists: ${Object.keys(err.keyValue).join(', ')}`; }
  if (err.name === 'MulterError') code = 400;
  res.status(code).json({ message, ...(process.env.NODE_ENV !== 'production' && code === 500 && { stack: err.stack }) });
};
