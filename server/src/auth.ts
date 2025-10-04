import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'changeme-secret';

export interface AdminJwtPayload {
  sub: string;
  email: string;
}

export function signAdminToken(payload: AdminJwtPayload, remember: boolean) {
  return jwt.sign(payload, secret, {
    expiresIn: remember ? '30d' : '12h',
  });
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminJwtPayload;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token;
  if (!token) {
    return res.status(401).json({ message: 'Nincs jogosultság' });
  }
  try {
    const payload = jwt.verify(token, secret) as AdminJwtPayload;
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Nincs jogosultság' });
  }
}
