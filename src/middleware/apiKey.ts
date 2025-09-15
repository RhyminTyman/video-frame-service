import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

const keys = new Set(
  (process.env.API_KEYS ?? '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (keys.size === 0) return res.status(500).json({ error: 'Server not configured with API_KEYS' });

  const headerKey = req.header('x-api-key') || '';
  const auth = req.header('authorization') || '';
  const bearerKey = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const queryKey = (req.query.api_key as string) || '';

  const candidate = headerKey || bearerKey || queryKey;
  for (const k of keys) {
    if (safeEqual(candidate, k)) return next();
  }
  return res.status(401).json({ error: 'Unauthorized (invalid API key)' });
}
