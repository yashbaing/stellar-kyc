import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection } from './db/connection';
import { requestLogger } from './middleware/auth';
import identityRouter from './routes/identity';
import consentRouter from './routes/consent';
import { logger } from './services/logger';
import { getProviderMatrix } from './services/kycProvider';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = 'v1';

// =============================================
// Security Middleware
// =============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Stellar-Account', 'X-Request-ID'],
  credentials: true,
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// =============================================
// Routes
// =============================================

// Health check
app.get('/health', async (_req, res) => {
  const dbHealthy = await testConnection().catch(() => false);
  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'up' : 'down',
      api: 'up',
    },
  });
});

// API Info
app.get(`/api/${API_VERSION}`, (_req, res) => {
  res.json({
    name: 'Stellar KYC API',
    version: API_VERSION,
    description: 'Reusable identity infrastructure for the Stellar ecosystem',
    endpoints: {
      identity: `/api/${API_VERSION}/identity`,
      consent: `/api/${API_VERSION}/identity/consent`,
    },
    standards: ['SEP-10', 'SEP-12', 'W3C-VC'],
    providers: getProviderMatrix().length,
    documentation: 'https://docs.stellarkyc.org/api',
  });
});

// SEP-12 compatible identity routes
app.use(`/api/${API_VERSION}/identity`, identityRouter);
app.use(`/api/${API_VERSION}/identity/consent`, consentRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      documentation: 'https://docs.stellarkyc.org/api',
    },
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message,
    },
  });
});

// =============================================
// Server Bootstrap
// =============================================
async function start() {
  try {
    logger.info('Starting Stellar KYC API server...');

    const dbConnected = await testConnection();
    if (!dbConnected && process.env.NODE_ENV === 'production') {
      throw new Error('Database connection required in production');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Stellar KYC API running on port ${PORT}`);
      logger.info(`📋 API docs: http://localhost:${PORT}/api/${API_VERSION}`);
      logger.info(`❤️  Health: http://localhost:${PORT}/health`);
      logger.info(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();

export default app;
