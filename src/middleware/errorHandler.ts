import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de gestion des erreurs global
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Éviter d'envoyer deux réponses
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Middleware pour les routes non trouvées
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
