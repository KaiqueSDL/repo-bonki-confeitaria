export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function errorHandler(error, req, res, next) {
  const status =
    error.status ||
    (error.code === 'LIMIT_FILE_SIZE' ? 413 : error.name === 'MulterError' ? 400 : 500);
  if (status >= 500)
    console.error(
      JSON.stringify({
        time: new Date().toISOString(),
        method: req.method,
        path: req.path,
        error: error.message,
      }),
    );
  res.status(status).json({
    error: status >= 500 ? 'Falha interna. A alteração não foi confirmada.' : error.message,
  });
}
