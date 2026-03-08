import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { requireSEP10Auth, requireApiKey, checkAnchorRateLimit } from '../middleware/auth';
import {
  upsertCustomer,
  processKYCVerification,
  getCustomerStatus,
  getCredential,
  revokeCredential,
} from '../services/credentials';
import { logger } from '../services/logger';

const router = Router();

const kycSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100),
  email: Joi.string().email(),
  phone_number: Joi.string().max(20),
  date_of_birth: Joi.string().isoDate(),
  address: Joi.string().max(500),
  city: Joi.string().max(100),
  country: Joi.string().length(2),
  id_type: Joi.string().valid('passport', 'national_id', 'drivers_license'),
  id_number: Joi.string().max(100),
  id_image: Joi.string().max(500),     // URL or base64 ref
  selfie: Joi.string().max(500),
  user_public_key: Joi.string().required(),
});

/**
 * PUT /identity/customer
 * Submit or update KYC data (SEP-12 compatible)
 */
router.put(
  '/customer',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    const { error, value } = kycSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
      return;
    }

    try {
      const stellarAccount = req.stellarAccount!;
      const { user_public_key, ...kycData } = value;

      // Create/update customer record
      const customer = await upsertCustomer(stellarAccount, kycData);

      // Trigger async verification if all required fields present
      const hasRequiredFields = kycData.first_name && kycData.last_name &&
        (kycData.id_number || kycData.email);

      if (hasRequiredFields && user_public_key) {
        // Process in background for production; await here for MVP
        try {
          const { credential, vc } = await processKYCVerification(customer, user_public_key);
          res.status(200).json({
            id: customer.id,
            status: 'verified',
            credential_id: credential.id,
            credential_hash: credential.credential_hash,
            expires_at: credential.expires_at,
            risk_level: credential.risk_level,
            verifiable_credential: vc,
            created_at: customer.created_at,
          });
        } catch (verifyError: unknown) {
          const errMsg = verifyError instanceof Error ? verifyError.message : 'Verification failed';
          res.status(200).json({
            id: customer.id,
            status: customer.status,
            message: errMsg,
            created_at: customer.created_at,
          });
        }
        return;
      }

      res.status(201).json({
        id: customer.id,
        status: customer.status,
        created_at: customer.created_at,
      });
    } catch (error) {
      logger.error('KYC submission error', error);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to process KYC' } });
    }
  }
);

/**
 * GET /identity/customer
 * Check KYC status (SEP-12 compatible)
 */
router.get(
  '/customer',
  requireApiKey,
  checkAnchorRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    const stellarAccount = req.query.stellar_account as string;

    if (!stellarAccount) {
      res.status(400).json({
        error: { code: 'MISSING_PARAM', message: 'stellar_account query parameter required' },
      });
      return;
    }

    try {
      const customer = await getCustomerStatus(stellarAccount);
      if (!customer) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'No KYC record found for this account' },
        });
        return;
      }

      const credential = await getCredential(stellarAccount);

      res.json({
        id: customer.id,
        status: customer.status,
        risk_level: customer.risk_level,
        verified_at: customer.verified_at,
        verified_by: customer.verified_by,
        expires_at: customer.expires_at,
        fields_verified: credential ? ['name', 'email', 'identity'] : [],
        credential_id: credential?.id,
        credential_hash: credential?.credential_hash,
        shared_with: [],
      });
    } catch (error) {
      logger.error('KYC status error', error);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get status' } });
    }
  }
);

/**
 * DELETE /identity/credential
 * Revoke a credential
 */
router.delete(
  '/credential',
  requireSEP10Auth,
  async (req: Request, res: Response): Promise<void> => {
    const { id, reason } = req.body;

    if (!id) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'id required' } });
      return;
    }

    try {
      await revokeCredential(id, req.stellarAccount!, reason || 'User requested revocation');
      res.json({
        revoked: true,
        revoked_at: Math.floor(Date.now() / 1000),
        reason: reason || 'User requested revocation',
      });
    } catch (error) {
      logger.error('Revocation error', error);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to revoke' } });
    }
  }
);

/**
 * GET /identity/verify-proof
 * Verify a credential via consent token
 */
router.get(
  '/verify-proof',
  requireApiKey,
  async (req: Request, res: Response): Promise<void> => {
    const consentId = req.query.consent_id as string;

    if (!consentId) {
      res.status(400).json({
        error: { code: 'MISSING_PARAM', message: 'consent_id required' },
      });
      return;
    }

    try {
      const { verifyCredentialByConsent } = await import('../services/credentials');
      const result = await verifyCredentialByConsent(consentId);

      if (!result) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Consent grant not found' },
        });
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Verification error', error);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Verification failed' } });
    }
  }
);

export default router;
