/**
 * @stellarkyc/sdk
 * TypeScript SDK for Stellar KYC credential verification
 *
 * Usage:
 *   import { StellarKYC } from '@stellarkyc/sdk';
 *   const kyc = new StellarKYC({ apiKey: 'your_key', network: 'testnet' });
 */

export interface StellarKYCConfig {
  apiKey: string;
  network: 'testnet' | 'mainnet';
  baseUrl?: string;
}

export interface ConsentRequest {
  account: string;
  fields: KYCField[];
  expiresIn?: number; // seconds, default 30 days
}

export interface ConsentResponse {
  consentRequestId: string;
  anchor: string;
  fields: KYCField[];
  userActionRequired: boolean;
  expiresAt: Date;
  credentialExists: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  verified: boolean;
  account: string;
  verifiedBy: string;
  verificationTimestamp: Date;
  riskLevel: 'low' | 'medium' | 'high';
  credentialAgeDays: number;
  fieldsVerified: KYCField[];
  expired: boolean;
}

export interface CustomerStatus {
  id: string;
  status: 'pending' | 'pending_review' | 'verified' | 'rejected' | 'expired' | 'revoked';
  riskLevel?: 'low' | 'medium' | 'high';
  verifiedAt?: Date;
  expiresAt?: Date;
  fieldsVerified: KYCField[];
  credentialId?: string;
  credentialHash?: string;
}

export type KYCField =
  | 'name'
  | 'email'
  | 'phone_number'
  | 'date_of_birth'
  | 'address'
  | 'city'
  | 'country'
  | 'risk_level'
  | 'identity';

export interface SDKError {
  code: string;
  message: string;
  statusCode?: number;
}

class StellarKYCError extends Error {
  code: string;
  statusCode?: number;

  constructor(error: SDKError) {
    super(error.message);
    this.name = 'StellarKYCError';
    this.code = error.code;
    this.statusCode = error.statusCode;
  }
}

export class StellarKYC {
  private apiKey: string;
  private baseUrl: string;
  private network: string;

  constructor(config: StellarKYCConfig) {
    this.apiKey = config.apiKey;
    this.network = config.network;
    this.baseUrl =
      config.baseUrl ||
      (config.network === 'mainnet'
        ? 'https://api.stellarkyc.org/v1'
        : 'https://api-testnet.stellarkyc.org/v1');
  }

  /**
   * Request consent from a user to access their verified KYC credentials.
   * The user must approve this request in their wallet interface.
   *
   * @example
   * const consent = await kyc.requestConsent({
   *   account: 'GUSER...',
   *   fields: ['name', 'email', 'risk_level']
   * });
   * // consent.userActionRequired === true
   * // Wait for user to approve, then call kyc.verify(consent.consentRequestId)
   */
  async requestConsent(request: ConsentRequest): Promise<ConsentResponse> {
    const response = (await this.post('/identity/consent/request', {
      stellar_account: request.account,
      fields_requested: request.fields,
      expires_in: request.expiresIn,
    })) as {
      consent_request_id: string;
      anchor: string;
      fields: KYCField[];
      user_action_required: boolean;
      expires_at: number;
      credential_exists: boolean;
    };

    return {
      consentRequestId: response.consent_request_id,
      anchor: response.anchor,
      fields: response.fields,
      userActionRequired: response.user_action_required,
      expiresAt: new Date(response.expires_at * 1000),
      credentialExists: response.credential_exists,
    };
  }

  /**
   * Verify a credential using an approved consent ID.
   * Call this after the user has approved the consent request.
   *
   * @example
   * const result = await kyc.verify('consent_abc123');
   * if (result.isValid && result.riskLevel === 'low') {
   *   // Onboard the user
   * }
   */
  async verify(consentId: string): Promise<VerificationResult> {
    const response = (await this.get(
      `/identity/verify-proof?consent_id=${consentId}`
    )) as {
      is_valid: boolean;
      verified: boolean;
      account: string;
      verified_by: string;
      verification_timestamp: number;
      risk_level: 'low' | 'medium' | 'high';
      credential_age_days: number;
      fields_verified: KYCField[];
      expired: boolean;
    };

    return {
      isValid: response.is_valid,
      verified: response.verified,
      account: response.account,
      verifiedBy: response.verified_by,
      verificationTimestamp: new Date(response.verification_timestamp * 1000),
      riskLevel: response.risk_level,
      credentialAgeDays: response.credential_age_days,
      fieldsVerified: response.fields_verified,
      expired: response.expired,
    };
  }

  /**
   * Get the KYC status of a user by their Stellar account address.
   * Use this to check if a user has existing verified credentials.
   */
  async getCustomerStatus(stellarAccount: string): Promise<CustomerStatus> {
    const response = (await this.get(
      `/identity/customer?stellar_account=${stellarAccount}`
    )) as {
      id: string;
      status: CustomerStatus['status'];
      risk_level?: 'low' | 'medium' | 'high';
      verified_at?: number;
      expires_at?: number;
      fields_verified?: KYCField[];
      credential_id?: string;
      credential_hash?: string;
    };

    return {
      id: response.id,
      status: response.status,
      riskLevel: response.risk_level,
      verifiedAt: response.verified_at
        ? new Date(response.verified_at * 1000)
        : undefined,
      expiresAt: response.expires_at
        ? new Date(response.expires_at * 1000)
        : undefined,
      fieldsVerified: response.fields_verified ?? [],
      credentialId: response.credential_id,
      credentialHash: response.credential_hash,
    };
  }

  /**
   * Check if a user has a valid credential without requesting consent.
   * Useful for showing UI hints like "You're already verified with another Stellar service"
   */
  async hasValidCredential(stellarAccount: string): Promise<boolean> {
    try {
      const status = await this.getCustomerStatus(stellarAccount);
      return status.status === 'verified';
    } catch {
      return false;
    }
  }

  /**
   * Poll for consent approval with a timeout.
   * Useful when waiting for the user to approve consent in their wallet.
   *
   * @example
   * const result = await kyc.pollForConsent(consentRequestId, {
   *   timeoutMs: 300000, // 5 minutes
   *   pollIntervalMs: 3000,
   *   onPending: () => console.log('Waiting for user approval...')
   * });
   */
  async pollForConsent(
    consentRequestId: string,
    options: {
      timeoutMs?: number;
      pollIntervalMs?: number;
      onPending?: () => void;
    } = {}
  ): Promise<VerificationResult> {
    const { timeoutMs = 300000, pollIntervalMs = 3000, onPending } = options;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const result = await this.verify(consentRequestId);
        if (result.isValid) return result;
      } catch (error) {
        if ((error as StellarKYCError).code === 'CONSENT_PENDING') {
          onPending?.();
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          continue;
        }
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new StellarKYCError({
      code: 'TIMEOUT',
      message: `Consent approval timed out after ${timeoutMs}ms`,
    });
  }

  private async get(path: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(response);
  }

  private async post(path: string, body: unknown): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  private async handleResponse(response: Response): Promise<Record<string, unknown>> {
    const data = await response.json();

    if (!response.ok) {
      throw new StellarKYCError({
        code: data.error?.code || 'UNKNOWN_ERROR',
        message: data.error?.message || 'An unknown error occurred',
        statusCode: response.status,
      });
    }

    return data as Record<string, unknown>;
  }
}

// Convenience exports
export { StellarKYCError };
export default StellarKYC;
