import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection';
import { getCredential } from './credentials';
import { verifySEP10Signature } from './encryption';
import { ConsentGrant, ConsentRequest } from '../types';
import { logger } from './logger';

const DEFAULT_CONSENT_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Creates a pending consent request from an anchor
 */
export async function createConsentRequest(
  stellarAccount: string,
  requestingAnchor: string,
  fieldsRequested: string[],
  expiresIn?: number
): Promise<{
  consent_request_id: string;
  anchor: string;
  fields: string[];
  user_action_required: boolean;
  expires_at: number;
  credential_exists: boolean;
}> {
  // Check if user has an existing verified credential
  const credential = await getCredential(stellarAccount);
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + (expiresIn || DEFAULT_CONSENT_EXPIRY_SECONDS);

  const consentRequestId = uuidv4();

  await query(
    `INSERT INTO consent_requests (id, stellar_account, credential_id, requesting_anchor, fields_requested, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      consentRequestId,
      stellarAccount,
      credential?.id || null,
      requestingAnchor,
      JSON.stringify(fieldsRequested),
      expiry,
    ]
  );

  logger.info('Consent request created', {
    id: consentRequestId,
    account: stellarAccount,
    anchor: requestingAnchor,
    hasCredential: !!credential,
  });

  return {
    consent_request_id: consentRequestId,
    anchor: requestingAnchor,
    fields: fieldsRequested,
    user_action_required: true,
    expires_at: expiry,
    credential_exists: !!credential,
  };
}

/**
 * Approves a consent request with user's SEP-10 signature
 */
export async function approveConsentRequest(
  consentRequestId: string,
  stellarAccount: string,
  signature: string
): Promise<{
  consent_id: string;
  credential_hash: string;
  fields_approved: string[];
  valid_until: number;
}> {
  // Verify SEP-10 signature
  if (!verifySEP10Signature(stellarAccount, signature)) {
    throw new Error('Invalid SEP-10 signature');
  }

  // Get the consent request
  const requestResult = await query<{
    id: string;
    credential_id: string;
    requesting_anchor: string;
    fields_requested: string;
    expires_at: number;
    status: string;
  }>(
    `SELECT * FROM consent_requests WHERE id = $1 AND stellar_account = $2`,
    [consentRequestId, stellarAccount]
  );

  if (!requestResult.rows[0]) {
    throw new Error('Consent request not found');
  }

  const request = requestResult.rows[0];

  if (request.status !== 'pending') {
    throw new Error(`Consent request is already ${request.status}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (request.expires_at < now) {
    throw new Error('Consent request has expired');
  }

  // Get credential
  const credential = await getCredential(stellarAccount);
  if (!credential) {
    throw new Error('No verified credential found for this account');
  }

  const fieldsApproved = JSON.parse(request.fields_requested) as string[];
  const consentId = uuidv4();
  const expiresAt = now + DEFAULT_CONSENT_EXPIRY_SECONDS;

  // Create consent grant
  await query(
    `INSERT INTO consent_grants (id, consent_request_id, credential_id, anchor_address, fields_shared, user_signature, granted_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      consentId,
      consentRequestId,
      credential.id,
      request.requesting_anchor,
      JSON.stringify(fieldsApproved),
      signature,
      now,
      expiresAt,
    ]
  );

  // Update consent request status
  await query(
    `UPDATE consent_requests SET status = 'approved' WHERE id = $1`,
    [consentRequestId]
  );

  logger.info('Consent approved', {
    consentId,
    account: stellarAccount,
    anchor: request.requesting_anchor,
    fields: fieldsApproved,
  });

  return {
    consent_id: consentId,
    credential_hash: credential.credential_hash,
    fields_approved: fieldsApproved,
    valid_until: expiresAt,
  };
}

/**
 * Denies a consent request
 */
export async function denyConsentRequest(
  consentRequestId: string,
  stellarAccount: string
): Promise<void> {
  await query(
    `UPDATE consent_requests SET status = 'denied' WHERE id = $1 AND stellar_account = $2`,
    [consentRequestId, stellarAccount]
  );
  logger.info('Consent denied', { consentRequestId, stellarAccount });
}

/**
 * Revokes a specific consent grant
 */
export async function revokeConsentGrant(
  consentId: string,
  stellarAccount: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  const result = await query(
    `UPDATE consent_grants cg
     SET revoked_at = $2
     FROM credentials c
     WHERE cg.id = $1
       AND c.id = cg.credential_id
       AND c.stellar_account = $3
       AND cg.revoked_at IS NULL`,
    [consentId, now, stellarAccount]
  );

  if (result.rowCount === 0) {
    throw new Error('Consent grant not found or already revoked');
  }

  logger.info('Consent revoked', { consentId, stellarAccount });
}

/**
 * Lists all active consents for a user
 */
export async function listUserConsents(stellarAccount: string): Promise<{
  active: ConsentGrant[];
  expired: ConsentGrant[];
  revoked: ConsentGrant[];
}> {
  const result = await query<ConsentGrant & { status: string }>(
    `SELECT cg.*, 
      CASE 
        WHEN cg.revoked_at IS NOT NULL THEN 'revoked'
        WHEN cg.expires_at < EXTRACT(EPOCH FROM NOW()) THEN 'expired'
        ELSE 'active'
      END as status
    FROM consent_grants cg
    JOIN credentials c ON cg.credential_id = c.id
    WHERE c.stellar_account = $1
    ORDER BY cg.created_at DESC`,
    [stellarAccount]
  );

  const active = result.rows.filter(r => r.status === 'active');
  const expired = result.rows.filter(r => r.status === 'expired');
  const revoked = result.rows.filter(r => r.status === 'revoked');

  return { active, expired, revoked };
}

/**
 * Gets the audit log for a user
 */
export async function getUserAuditLog(
  stellarAccount: string,
  limit = 50,
  offset = 0
): Promise<{
  entries: Array<{
    id: number;
    consent_id: string;
    anchor_address: string;
    fields_accessed: string[];
    accessed_at: number;
  }>;
  total: number;
}> {
  const result = await query<{
    id: number;
    consent_id: string;
    anchor_address: string;
    fields_accessed: string;
    accessed_at: number;
    total: number;
  }>(
    `SELECT 
      al.id, al.consent_id, al.anchor_address, al.fields_accessed, al.accessed_at,
      COUNT(*) OVER() as total
    FROM access_audit_log al
    JOIN consent_grants cg ON al.consent_id = cg.id
    JOIN credentials c ON cg.credential_id = c.id
    WHERE c.stellar_account = $1
    ORDER BY al.accessed_at DESC
    LIMIT $2 OFFSET $3`,
    [stellarAccount, limit, offset]
  );

  return {
    entries: result.rows.map(r => ({
      ...r,
      fields_accessed: JSON.parse(r.fields_accessed),
    })),
    total: result.rows[0]?.total ?? 0,
  };
}

/**
 * Checks if an anchor has valid consent for a Stellar account
 */
export async function checkConsentValidity(
  stellarAccount: string,
  anchorAddress: string
): Promise<ConsentGrant | null> {
  const now = Math.floor(Date.now() / 1000);

  const result = await query<ConsentGrant>(
    `SELECT cg.*
     FROM consent_grants cg
     JOIN credentials c ON cg.credential_id = c.id
     WHERE c.stellar_account = $1
       AND cg.anchor_address = $2
       AND cg.revoked_at IS NULL
       AND cg.expires_at > $3
     ORDER BY cg.granted_at DESC LIMIT 1`,
    [stellarAccount, anchorAddress, now]
  );

  return result.rows[0] || null;
}

/**
 * Gets pending consent requests for a user
 */
export async function getPendingConsentRequests(stellarAccount: string) {
  const now = Math.floor(Date.now() / 1000);

  const result = await query(
    `SELECT * FROM consent_requests
     WHERE stellar_account = $1 AND status = 'pending' AND expires_at > $2
     ORDER BY created_at DESC`,
    [stellarAccount, now]
  );

  return result.rows.map(r => ({
    ...r,
    fields_requested: JSON.parse(String(r.fields_requested ?? '[]')),
  }));
}
