export type RiskLevel = 'low' | 'medium' | 'high';
export type KYCStatus = 'pending' | 'pending_review' | 'verified' | 'rejected' | 'expired' | 'revoked';
export type ConsentStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'revoked';

export interface KYCCustomer {
  id: string;
  stellar_account: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  id_type?: 'passport' | 'national_id' | 'drivers_license';
  id_number?: string;
  id_image_url?: string;
  selfie_url?: string;
  status: KYCStatus;
  risk_level?: RiskLevel;
  verified_at?: number;
  expires_at?: number;
  verified_by?: string;
  created_at: number;
  updated_at: number;
}

export interface Credential {
  id: string;
  stellar_account: string;
  verifier_address: string;
  encrypted_data: Buffer;
  encryption_nonce: string;
  server_public_key: string;
  risk_level: RiskLevel;
  verified_at: number;
  expires_at: number;
  revoked_at?: number;
  credential_hash: string;
  created_at: number;
  updated_at: number;
}

export interface ConsentGrant {
  id: string;
  credential_id: string;
  anchor_address: string;
  fields_shared: string[];
  granted_at: number;
  expires_at: number;
  revoked_at?: number;
  created_at: number;
}

export interface AccessAuditLog {
  id: number;
  consent_id: string;
  anchor_address: string;
  fields_accessed: string[];
  accessed_at: number;
  user_ip?: string;
}

export interface RevocationEvent {
  id: string;
  credential_id: string;
  revoked_by: string;
  reason: string;
  revoked_at: number;
}

export interface W3CVerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: { id: string };
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string;
    name: string;
    email?: string;
    verified_fields: string[];
    risk_classification: RiskLevel;
    kyc_timestamp: number;
    identity_document?: {
      type: string;
      country: string;
    };
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    signatureValue: string;
  };
}

export interface ConsentToken {
  consent_id: string;
  credential_id: string;
  requesting_anchor: string;
  approved_fields: string[];
  granted_at: number;
  expires_at: number;
  user_signature: string;
}

export interface EncryptedPackage {
  nonce: string;
  ciphertext: string;
  credential_hash: string;
  server_public_key: string;
}

export interface ProviderConfig {
  provider: string;
  method: string;
  cost: number;
  avgTime: number;
  country?: string;
}

export interface VerificationResult {
  is_valid: boolean;
  verified: boolean;
  account: string;
  verified_by: string;
  verification_timestamp: number;
  risk_level: RiskLevel;
  credential_age_days: number;
  fields_verified: string[];
  expired: boolean;
}

export interface KYCRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  id_type?: string;
  id_number?: string;
  id_image?: string;
  selfie?: string;
}

export interface ConsentRequest {
  stellar_account: string;
  requesting_anchor: string;
  fields_requested: string[];
  expires_in?: number;
}

export interface ConsentApproval {
  consent_request_id: string;
  stellar_account: string;
  signature: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
