import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const SALT_ROUNDS = 12;

// ============================================================
// Password Utilities
// ============================================================

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ============================================================
// JWT Utilities
// ============================================================

export interface AccessTokenPayload {
  sub: string;       // userId
  role: string;
  teacherId?: string;
  parentId?: string;
}

export interface RefreshTokenPayload {
  sub: string;       // userId
  jti: string;       // token id (for revocation)
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'classpilot',
    audience: 'classpilot-client',
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'classpilot',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET, {
    issuer: 'classpilot',
    audience: 'classpilot-client',
  }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET, {
    issuer: 'classpilot',
  }) as RefreshTokenPayload;
}

// ============================================================
// QR Code Utilities
// ============================================================

import crypto from 'crypto';

export function signQRPayload(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', config.QR_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
}

export function verifyQRPayload(token: string): Record<string, unknown> {
  const decoded = Buffer.from(token, 'base64url').toString('utf-8');
  const { payload, signature } = JSON.parse(decoded) as { payload: string; signature: string };

  const hmac = crypto.createHmac('sha256', config.QR_SECRET);
  hmac.update(payload);
  const expected = hmac.digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid QR signature');
  }

  return JSON.parse(payload) as Record<string, unknown>;
}

// ============================================================
// Misc Utilities
// ============================================================

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900000; // 15 min default
  const [, num, unit] = match;
  const value = parseInt(num, 10);
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] ?? 60000);
}
