/**
 * @file middleware.ts
 * @description Shared Express middleware + configuration for the MediKiosk+
 * backend: rate limiting, JWT authentication, role guards and CORS.
 * Extracted from the legacy monolithic `server.ts`.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import type { CorsOptions } from 'cors';

export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('FATAL: JWT_SECRET environment variable must be explicitly configured in production environment!'); })()
  : 'medikiosk-dev-jwt-secret-local-only-2025');

export const PORT = parseInt(process.env.PORT || '3000', 10);

// Rate limiting middleware
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Authentication middleware
export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'doctor' | 'staff';
    fullName: string;
  };
}

export interface PatientSessionRequest extends express.Request {
  patientSession?: { id: string; scope: 'patient' };
}

export function authenticateToken(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = decoded;
    next();
  });
}

/** A short-lived token issued only after a successful patient OTP challenge. */
export function authenticatePatientSession(req: PatientSessionRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Patient portal session required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; scope?: string };
    if (!decoded.id || decoded.scope !== 'patient') {
      return res.status(403).json({ error: 'This session cannot access patient records' });
    }
    req.patientSession = { id: decoded.id, scope: 'patient' };
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired patient portal session' });
  }
}

export function requireRole(...roles: AuthenticatedRequest['user']['role'][]) {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    authenticateToken(req, res, () => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'You are not authorized for this action' });
      }
      next();
    });
  };
}

/**
 * CORS configuration for the split deployment (frontend on Vercel, backend on
 * Render). Accepts a comma-separated FRONTEND_URL list, e.g.
 * `FRONTEND_URL=https://medikiosk.vercel.app,http://localhost:5173`.
 */
export function buildCorsOptions(): CorsOptions {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
}

export const corsOptions = buildCorsOptions();