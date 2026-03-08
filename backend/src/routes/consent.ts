import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { requireSEP10Auth, requireApiKey } from '../middleware/auth';
import {
  createConsentRequest,
  approveConsentRequest,
  denyConsentRequest,
  revokeConsentGrant,
  listUserConsents,
  getUserAuditLog,
  getPendingConsentRequests,
} from '../services/consent';
import { logger } from '../services/logger';

const router = Router();

const ALLOWED_FIELDS = [
  'name', 'email', 'phone_number', 'date_of_birth',
  'address', 'city', 'country', 'risk_level', 'identity',
];

/**
 * POST /identity/consent/request
 * Anchor requests consent from a user
 */
router.post(
  '/request',
  requireApiKey,
  async (req: Request, res: Response): Promise<void> => {
    const schema = Joi.object({
      stellar_account: Joi.string().required(),
      fields_requested: Joi.array().items(Joi.string().valid(...ALLOWED_FIELDS)).min(1).required(),
      expires_in: Joi.number().integer().min(3600).max(86400 * 90),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
      return;
    }

    try {
      const result = await createConsentRequest(
        value.stellar_account,
        req.anchorAddress!,
        value.fields_requested,
        value.expires_in
      );
      res.status(201).json(result);
    } catch (err) {
      logger.error('Consent request error', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create consent request' } });
    }
  }
);

/**
 * POST /identity/consent/approve
 * User approves a consent request
 */
router.post(
  '/approve',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    const schema = Joi.object({
      consent_request_id: Joi.string().uuid().required(),
      signature: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
      return;
    }

    try {
      const result = await approveConsentRequest(
        value.consent_request_id,
        req.stellarAccount!,
        value.signature
      );
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve consent';
      logger.error('Consent approval error', err);

      if (msg.includes('not found')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: msg } });
        return;
      }
      if (msg.includes('expired') || msg.includes('already')) {
        res.status(409).json({ error: { code: 'CONFLICT', message: msg } });
        return;
      }
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: msg } });
    }
  }
);

/**
 * POST /identity/consent/deny
 * User denies a consent request
 */
router.post(
  '/deny',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    const { consent_request_id } = req.body;
    if (!consent_request_id) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'consent_request_id required' } });
      return;
    }

    try {
      await denyConsentRequest(consent_request_id, req.stellarAccount!);
      res.json({ denied: true, consent_request_id });
    } catch (err) {
      logger.error('Consent denial error', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to deny consent' } });
    }
  }
);

/**
 * DELETE /identity/consent/:id
 * User revokes a specific consent grant
 */
router.delete(
  '/:id',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await revokeConsentGrant(req.params.id, req.stellarAccount!);
      res.json({ revoked: true, consent_id: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke consent';
      logger.error('Consent revocation error', err);
      if (msg.includes('not found')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: msg } });
        return;
      }
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: msg } });
    }
  }
);

/**
 * GET /identity/consent/list
 * List all consents for a user
 */
router.get(
  '/list',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const consents = await listUserConsents(req.stellarAccount!);
      res.json(consents);
    } catch (err) {
      logger.error('List consents error', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to list consents' } });
    }
  }
);

/**
 * GET /identity/consent/pending
 * Get pending consent requests for a user
 */
router.get(
  '/pending',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pending = await getPendingConsentRequests(req.stellarAccount!);
      res.json({ requests: pending });
    } catch (err) {
      logger.error('Pending consents error', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get pending requests' } });
    }
  }
);

/**
 * GET /identity/consent/audit
 * Get audit log for a user
 */
router.get(
  '/audit',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 100);
    const offset = parseInt(req.query.offset as string || '0');

    try {
      const auditLog = await getUserAuditLog(req.stellarAccount!, limit, offset);
      res.json(auditLog);
    } catch (err) {
      logger.error('Audit log error', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get audit log' } });
    }
  }
);

export default router;
