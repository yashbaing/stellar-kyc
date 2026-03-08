import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../db/connection';
import { encryptCredential } from './encryption';
import { routeKYCProvider, verifyWithProvider, runAutomatedPreChecks } from './kycProvider';
import {
  KYCCustomer, Credential, W3CVerifiableCredential,
  KYCRequest, RiskLevel, VerificationResult
} from '../types';
import { logger } from './logger';

const STELLAR_ANCHOR_DID = process.env.ANCHOR_DID || 'did:stellar:GANCHOR_PLATFORM';
const CREDENTIAL_EXPIRY_DAYS = parseInt(process.env.CREDENTIAL_EXPIRY_DAYS || '365');

/**
 * Creates or updates a KYC customer record
 */
export async function upsertCustomer(
  stellarAccount: string,
  kycData: KYCRequest
): Promise<KYCCustomer> {
  const now = Math.floor(Date.now() / 1000);

  const existing = await query<KYCCustomer>(
    'SELECT * FROM kyc_customers WHERE stellar_account = $1',
    [stellarAccount]
  );

  if (existing.rows.length > 0) {
    const result = await query<KYCCustomer>(
      `UPDATE kyc_customers SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone_number = COALESCE($5, phone_number),
        date_of_birth = COALESCE($6::date, date_of_birth),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        country = COALESCE($9, country),
        id_type = COALESCE($10, id_type),
        id_number = COALESCE($11, id_number),
        id_image_url = COALESCE($12, id_image_url),
        selfie_url = COALESCE($13, selfie_url),
        status = 'pending_review',
        updated_at = $14
      WHERE stellar_account = $1
      RETURNING *`,
      [
        stellarAccount, kycData.first_name, kycData.last_name,
        kycData.email, kycData.phone_number, kycData.date_of_birth,
        kycData.address, kycData.city, kycData.country,
        kycData.id_type, kycData.id_number, kycData.id_image,
        kycData.selfie, now
      ]
    );
    return result.rows[0];
  }

  const result = await query<KYCCustomer>(
    `INSERT INTO kyc_customers (
      id, stellar_account, first_name, last_name, email, phone_number,
      date_of_birth, address, city, country, id_type, id_number,
      id_image_url, selfie_url, status, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,$12,$13,$14,'pending_review',$15,$15)
    RETURNING *`,
    [
      uuidv4(), stellarAccount, kycData.first_name, kycData.last_name,
      kycData.email, kycData.phone_number, kycData.date_of_birth,
      kycData.address, kycData.city, kycData.country,
      kycData.id_type, kycData.id_number, kycData.id_image,
      kycData.selfie, now
    ]
  );
  return result.rows[0];
}

/**
 * Processes KYC verification and issues W3C Verifiable Credential
 */
export async function processKYCVerification(
  customer: KYCCustomer,
  userPublicKey: string
): Promise<{ credential: Credential; vc: W3CVerifiableCredential }> {
  logger.info('Processing KYC verification', { account: customer.stellar_account });

  const customerData = {
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
    phone_number: customer.phone_number,
    date_of_birth: customer.date_of_birth,
    address: customer.address,
    id_type: customer.id_type,
    id_number: customer.id_number,
    id_image: customer.id_image_url,
    selfie: customer.selfie_url,
  };

  // Run automated pre-checks
  const preChecks = await runAutomatedPreChecks(customerData);
  logger.info('Pre-checks completed', { score: preChecks.score, cost: preChecks.cost });

  if (!preChecks.passed) {
    await query(
      `UPDATE kyc_customers SET status = 'rejected', rejection_reason = $2 WHERE stellar_account = $1`,
      [customer.stellar_account, 'Automated pre-checks failed']
    );
    throw new Error('KYC verification failed: automated pre-checks did not pass');
  }

  // Route to appropriate provider
  const providerConfig = await routeKYCProvider(
    customer.country || 'default',
    customer.id_type || 'passport',
    customer.phone_number
  );

  // Verify with provider
  const verificationResult = await verifyWithProvider(providerConfig, customerData);

  if (verificationResult.status === 'rejected') {
    await query(
      `UPDATE kyc_customers SET status = 'rejected', updated_at = $2 WHERE stellar_account = $1`,
      [customer.stellar_account, Math.floor(Date.now() / 1000)]
    );
    throw new Error('KYC verification rejected by provider');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + CREDENTIAL_EXPIRY_DAYS * 24 * 60 * 60;

  // Build W3C Verifiable Credential
  const vc: W3CVerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://stellar.org/credentials/v1',
    ],
    id: `urn:uuid:cred_${uuidv4().replace(/-/g, '')}`,
    type: ['VerifiableCredential', 'KYCCredential'],
    issuer: { id: STELLAR_ANCHOR_DID },
    issuanceDate: new Date(now * 1000).toISOString(),
    expirationDate: new Date(expiresAt * 1000).toISOString(),
    credentialSubject: {
      id: `did:stellar:${customer.stellar_account}`,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      email: customer.email,
      verified_fields: verificationResult.verified_fields,
      risk_classification: verificationResult.risk_level,
      kyc_timestamp: now,
      identity_document: customer.id_type ? {
        type: customer.id_type,
        country: customer.country || 'XX',
      } : undefined,
    },
    proof: {
      type: 'StellarSorobanSignature',
      created: new Date(now * 1000).toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${STELLAR_ANCHOR_DID}#key-1`,
      signatureValue: Buffer.from(`sig_${now}`).toString('base64'),
    },
  };

  // Encrypt the credential
  const encrypted = await encryptCredential(vc, userPublicKey);

  // Store credential in database
  const credential = await withTransaction(async (client) => {
    const credResult = await client.query<Credential>(
      `INSERT INTO credentials (
        id, stellar_account, verifier_address, encrypted_data, encryption_nonce,
        server_public_key, risk_level, verified_at, expires_at, credential_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (stellar_account, verifier_address)
      DO UPDATE SET
        encrypted_data = EXCLUDED.encrypted_data,
        encryption_nonce = EXCLUDED.encryption_nonce,
        server_public_key = EXCLUDED.server_public_key,
        risk_level = EXCLUDED.risk_level,
        verified_at = EXCLUDED.verified_at,
        expires_at = EXCLUDED.expires_at,
        credential_hash = EXCLUDED.credential_hash,
        revoked_at = NULL,
        updated_at = $8
      RETURNING *`,
      [
        uuidv4(),
        customer.stellar_account,
        STELLAR_ANCHOR_DID,
        Buffer.from(encrypted.ciphertext, 'base64'),
        encrypted.nonce,
        encrypted.server_public_key,
        verificationResult.risk_level,
        now,
        expiresAt,
        encrypted.credential_hash,
      ]
    );

    // Update customer status
    await client.query(
      `UPDATE kyc_customers SET
        status = $2,
        risk_level = $3,
        verified_at = $4,
        expires_at = $5,
        verified_by = $6,
        updated_at = $4
      WHERE stellar_account = $1`,
      [
        customer.stellar_account,
        verificationResult.status === 'verified' ? 'verified' : 'pending_review',
        verificationResult.risk_level,
        now,
        expiresAt,
        providerConfig.provider,
      ]
    );

    return credResult.rows[0];
  });

  logger.info('Credential issued successfully', {
    account: customer.stellar_account,
    hash: encrypted.credential_hash,
  });

  return { credential, vc };
}

/**
 * Gets customer KYC status
 */
export async function getCustomerStatus(stellarAccount: string): Promise<KYCCustomer | null> {
  const result = await query<KYCCustomer>(
    'SELECT * FROM kyc_customers WHERE stellar_account = $1',
    [stellarAccount]
  );
  return result.rows[0] || null;
}

/**
 * Gets a credential by Stellar account
 */
export async function getCredential(stellarAccount: string): Promise<Credential | null> {
  const result = await query<Credential>(
    `SELECT * FROM credentials
     WHERE stellar_account = $1 AND revoked_at IS NULL
     ORDER BY verified_at DESC LIMIT 1`,
    [stellarAccount]
  );
  return result.rows[0] || null;
}

/**
 * Verifies a credential via consent token
 */
export async function verifyCredentialByConsent(
  consentId: string
): Promise<VerificationResult | null> {
  const result = await query<{
    credential_id: string;
    anchor_address: string;
    fields_shared: string;
    expires_at: number;
    revoked_at: number | null;
    cred_expires_at: number;
    cred_revoked_at: number | null;
    stellar_account: string;
    verified_at: number;
    risk_level: RiskLevel;
    verifier_address: string;
  }>(
    `SELECT
      cg.credential_id, cg.anchor_address, cg.fields_shared,
      cg.expires_at, cg.revoked_at,
      c.expires_at as cred_expires_at, c.revoked_at as cred_revoked_at,
      c.stellar_account, c.verified_at, c.risk_level, c.verifier_address
    FROM consent_grants cg
    JOIN credentials c ON cg.credential_id = c.id
    WHERE cg.id = $1`,
    [consentId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  const now = Math.floor(Date.now() / 1000);

  // Log access
  await query(
    `INSERT INTO access_audit_log (consent_id, anchor_address, fields_accessed, accessed_at)
     VALUES ($1, $2, $3, $4)`,
    [consentId, row.anchor_address, row.fields_shared, now]
  );

  const isExpired = row.expires_at < now || row.cred_expires_at < now;
  const isRevoked = row.revoked_at !== null || row.cred_revoked_at !== null;
  const isValid = !isExpired && !isRevoked;

  return {
    is_valid: isValid,
    verified: isValid,
    account: row.stellar_account,
    verified_by: row.verifier_address,
    verification_timestamp: row.verified_at,
    risk_level: row.risk_level,
    credential_age_days: Math.floor((now - row.verified_at) / 86400),
    fields_verified: JSON.parse(row.fields_shared),
    expired: isExpired,
  };
}

/**
 * Revokes a credential
 */
export async function revokeCredential(
  credentialId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE credentials SET revoked_at = $2, updated_at = $2 WHERE id = $1`,
      [credentialId, now]
    );

    await client.query(
      `INSERT INTO revocation_events (id, credential_id, revoked_by, reason, revoked_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), credentialId, revokedBy, reason, now]
    );

    await client.query(
      `UPDATE consent_grants SET revoked_at = $2 WHERE credential_id = $1 AND revoked_at IS NULL`,
      [credentialId, now]
    );
  });

  logger.info('Credential revoked', { credentialId, revokedBy, reason });
}
