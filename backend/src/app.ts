/**
 * @file app.ts
 * @description MediKiosk+ backend entry point. Assembles the Express app from
 * the route modules, applies global middleware (JSON body, rate limiting,
 * CORS), starts the ABDM token manager and listens for connections.
 *
 * The React frontend is deployed separately (Vercel) and talks to this API
 * purely over HTTP — nothing in this entry point serves static frontend files.
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { corsOptions, apiLimiter, PORT } from './middleware';
import { abdmTokenManager } from './services/abdmTokenManager';

import healthRouter from './routes/health';
import masterDataRouter from './routes/masterData';
import patientsRouter from './routes/patients';
import abdmRouter from './routes/abdm';
import queueRouter from './routes/queue';
import encountersRouter from './routes/encounters';
import sseRouter from './routes/sse';
import fhirRouter from './routes/fhir';
import correctionsRouter from './routes/corrections';
import consentRouter from './routes/consent';
import analyticsRouter from './routes/analytics';
import asrRouter from './routes/asr';
import sarvamRouter from './routes/sarvam';
import notificationsRouter from './routes/notifications';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import geminiRouter from './routes/gemini';
import converseRouter from './routes/converse';
import aiRouter from './routes/ai';
import documentsRouter from './routes/documents';
import prescriptionsRouter from './routes/prescriptions';
import chatRouter from './routes/chat';
import qrRouter from './routes/qr';

dotenv.config();

const app = express();

// Trust the first hop so req.ip (used for rate limiting & session logging) is
// correct when running behind Render's / a cloud provider's reverse proxy.
app.set('trust proxy', 1);

// GLOBAL MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json({ limit: '25mb' }));
app.use(cors(corsOptions));
app.use('/api/', apiLimiter);

// ROUTE MODULES (mounted in the same relative order as the legacy server.ts;
// duplicate handlers from the old monolith have been pruned) ────────────────
app.use(healthRouter);
app.use(masterDataRouter);
app.use(patientsRouter);
app.use(abdmRouter);
app.use(queueRouter);
app.use(encountersRouter);
app.use(sseRouter);
app.use(fhirRouter);
app.use(correctionsRouter);
app.use(consentRouter);
app.use(analyticsRouter);
app.use(asrRouter);
app.use(sarvamRouter);
app.use(notificationsRouter);
app.use(authRouter);
app.use(adminRouter);
app.use(geminiRouter);
app.use(converseRouter);
app.use(aiRouter);
app.use(documentsRouter);
app.use(prescriptionsRouter);
app.use(chatRouter);
app.use(qrRouter);

// Container / load-balancer friendly health probes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'medikiosk-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// JSON 404s — the standalone backend serves no SPA, so never fall back to HTML
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler (never transports HTML stack traces to clients)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err?.message || err);
  res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
});

// STARTUP ──────────────────────────────────────────────────────────
abdmTokenManager.start();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MediKiosk+ Backend API running on http://0.0.0.0:${PORT}`);
});

export default app;