import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import framesRouter from './routes/frames.js';
// import { apiKeyAuth } from './middleware/apiKey.js';
// import { hmacAuth } from './middleware/hmac.js';

const PORT = Number(process.env.PORT ?? 3001);
const ORIGIN = process.env.CORS_ORIGIN ?? '*';

const app = express();
app.disable('x-powered-by');

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({ origin: ORIGIN }));

// Logging
app.use(morgan('combined'));

// Basic DoS protection (tune limits as needed)
app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Auth layers - DISABLED FOR TESTING
// app.use('/api/', apiKeyAuth); // required
// app.use('/api/', hmacAuth);   // optional; enabled if SIGNING_KEYS present

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/frames', framesRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error safety
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`Video Frame Service (secure, no-disk) listening on http://localhost:${PORT}`);
});
