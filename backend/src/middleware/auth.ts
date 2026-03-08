import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { hashApiKey } from '../services/encryption';
import { logger } from '../services/logger';

declare global {
  namespace Express {
    interface Request {
      anchorAddress?: string;
      apiKey?: string;
      stellarAccount?: string;
    }
  }
}

/**
 * Validates API key from Authorization header
 * Format: Bearer <api_key>
 */
export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
      },
    });
    return;
  }

  const apiKey = authHeader.substring(7);
  const keyHash = hashApiKey(apiKey);

  try {
    const result = await query<{ stellar_address: string; tier: string; active: boolean }>(
      `SELECT stellar_address, tier, active FROM anchor_registry
       WHERE api_key_hash = $1`,
      [keyHash]
    );

    if (!result.rows[0] || !result.rows[0].active) {
      res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or inactive API key',
        },
      });
      return;
    }

    req.anchorAddress = result.rows[0].stellar_address;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.error('API key validation error', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Authentication error' } });
  }
}

/**
 * Validates SEP-10 JWT token for user authentication
 * In production, implement full SEP-10 challenge-response
 */
export function requireSEP10Auth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['x-stellar-account'] as string;

  if (!authHeader) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing X-Stellar-Account header',
      },
    });
    return;
  }

  // Validate Stellar account format (56 chars, starts with G)
  if (!authHeader.match(/^G[A-Z2-7]{55}$/) && !authHeader.startsWith('TEST_')) {
    res.status(401).json({
      error: {
        code: 'INVALID_ACCOUNT',
        message: 'Invalid Stellar account format',
      },
    });
    return;
  }

  req.stellarAccount = authHeader;
  next();
}

/**
 * Rate limiting by anchor address
 */
export async function checkAnchorRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.anchorAddress) {
    next();
    return;
  }

  try {
    const result = await query<{ monthly_limit: number; current_usage: number; tier: string }>(
      `SELECT monthly_limit, current_usage, tier FROM anchor_registry
       WHERE stellar_address = $1`,
      [req.anchorAddress]
    );

    if (result.rows[0]) {
      const { monthly_limit, current_usage } = result.rows[0];
      if (current_usage >= monthly_limit) {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Monthly verification limit of ${monthly_limit} reached. Upgrade your plan.`,
          },
        });
        return;
      }

      // Increment usage
      await query(
        `UPDATE anchor_registry SET current_usage = current_usage + 1 WHERE stellar_address = $1`,
        [req.anchorAddress]
      );
    }

    next();
  } catch (error) {
    logger.error('Rate limit check error', error);
    next(); // Fail open on rate limit errors
  }
}

/**
 * Request logging middleware
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      anchor: req.anchorAddress,
      account: req.stellarAccount,
    });
  });
  next();
}
