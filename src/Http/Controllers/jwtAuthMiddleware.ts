import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as { user_id: number, email?: string };
    (req as any).user_id = decoded.user_id;
    if (decoded.email) {
      (req as any).email = decoded.email;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
} 