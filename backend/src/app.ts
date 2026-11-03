import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import agendaRoutes from './routes/agenda';
import adminRoutes from './routes/admin';
import passkeyRoutes from './routes/passkeys';

dotenv.config();

export const app: Express = express();

// Number of trusted proxies in front of the app (frontend nginx = 1, reverse proxy + nginx = 2).
// Without this, every per-IP limit sees the proxy's address and locks all clients together.
export function parseTrustProxy(value: string | undefined): number | boolean | string {
  if (value === undefined || value.trim() === '') return 1;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed; // e.g. 'loopback' or a comma-separated list of addresses
}
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/agendas', agendaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/passkeys', passkeyRoutes);

export default app;
