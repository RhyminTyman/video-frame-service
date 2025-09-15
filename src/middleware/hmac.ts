import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

type KeyMap = Record<string, string>;

const keyMap: KeyMap = (process.env.SIGNING_KEYS ?? '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)
  .reduce((acc: KeyMap, pair) => {
    const idx = pair.indexOf(':');
    if (idx > 0) {
      const id = pair.slice(0, idx);
      const secret = pair.slice(idx + 1);
      if (id && secret) acc[id] = secret;
    }
    return acc;
  }, {});

const MAX_SKEW = Number(process.env.SIGNING_MAX_SKEW ?? 300);

function hmacSha256(key: string, msg: string) {
  return crypto.createHmac('sha256', key).update(msg).digest('base64');
}

export function hmacAuth(req: Request, res: Response, next: NextFunction) {
  if (Object.keys(keyMap).length === 0) return next();

  const keyId = req.header('x-key-id') || '';
  const ts = req.header('x-timestamp') || '';
  const sig = req.header('x-signature') || '';

  if (!keyId || !ts || !sig) {
    return res.status(401).json({ error: 'Missing signature headers' });
  }

  const secret = keyMap[keyId];
  if (!secret) return res.status(401).json({ error: 'Unknown key id' });

  const now = Math.floor(Date.now() / 1000);
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > MAX_SKEW) {
    return res.status(401).json({ error: 'Timestamp skew too large' });
  }

  const contentLength = req.header('content-length') || '0';
  const canonical = [
    req.method.toUpperCase(),
    req.originalUrl,
    tsNum.toString(),
    contentLength
  ].join('\n');

  const expected = hmacSha256(secret, canonical);

  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  return next();
}
