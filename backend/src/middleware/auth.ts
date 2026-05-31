import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../config/database';

export interface AuthUser {
  id: string;
  role: string;
  branch_id: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token kerak' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token yaroqsiz' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Avtorizatsiya kerak' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Ruxsat yo\'q' });
      return;
    }
    next();
  };
}

export function requireBranchAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Avtorizatsiya kerak' });
    return;
  }
  if (req.user.role === 'owner' || req.user.role === 'accountant') {
    next();
    return;
  }
  const branchId = req.params.branchId || req.query.branchId;
  if (req.user.branch_id !== branchId) {
    res.status(403).json({ error: 'Bu filialga ruxsat yo\'q' });
    return;
  }
  next();
}
