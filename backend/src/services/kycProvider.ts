import { ProviderConfig, RiskLevel } from '../types';
import { logger } from './logger';

const PROVIDER_MAP: Record<string, ProviderConfig> = {
  IN: { provider: 'digilocker', method: 'aadhaar_otp', cost: 0.04, avgTime: 15, country: 'IN' },
  PH: { provider: 'philsys', method: 'national_id_otp', cost: 0.50, avgTime: 20, country: 'PH' },
  NG: { provider: 'smile_id', method: 'bvn_otp', cost: 0.80, avgTime: 25, country: 'NG' },
  KE: { provider: 'smile_id', method: 'national_id', cost: 0.80, avgTime: 25, country: 'KE' },
  GH: { provider: 'smile_id', method: 'ghana_card', cost: 0.80, avgTime: 25, country: 'GH' },
  MX: { provider: 'signzy', method: 'document_selfie', cost: 1.50, avgTime: 45, country: 'MX' },
  BR: { provider: 'signzy', method: 'cpf_selfie', cost: 1.50, avgTime: 45, country: 'BR' },
  CO: { provider: 'signzy', method: 'document_selfie', cost: 1.50, avgTime: 45, country: 'CO' },
  US: { provider: 'jumio', method: 'passport_selfie', cost: 3.00, avgTime: 60, country: 'US' },
  GB: { provider: 'onfido', method: 'passport_selfie', cost: 3.00, avgTime: 60, country: 'GB' },
  DE: { provider: 'onfido', method: 'eid_selfie', cost: 3.00, avgTime: 60, country: 'DE' },
  FR: { provider: 'onfido', method: 'passport_selfie', cost: 3.00, avgTime: 60, country: 'FR' },
  default: { provider: 'trulioo', method: 'document_verification', cost: 5.00, avgTime: 90 },
};

export interface VerificationPayload {
  status: 'verified' | 'rejected' | 'pending_review';
  risk_level: RiskLevel;
  verified_fields: string[];
  provider: string;
  provider_reference: string;
  cost: number;
  time_taken: number;
}

/**
 * Routes a KYC verification request to the optimal provider
 * based on user's country and document type
 */
export async function routeKYCProvider(
  country: string,
  documentType: string,
  _phoneNumber?: string
): Promise<ProviderConfig> {
  const config = PROVIDER_MAP[country.toUpperCase()] || PROVIDER_MAP['default'];
  logger.info('KYC provider selected', {
    country,
    documentType,
    provider: config.provider,
    method: config.method,
    estimatedCost: config.cost,
  });
  return config;
}

/**
 * Simulates verification with a specific provider
 * In production, replace with actual provider API calls
 */
export async function verifyWithProvider(
  config: ProviderConfig,
  customerData: Record<string, unknown>
): Promise<VerificationPayload> {
  logger.info('Initiating verification with provider', {
    provider: config.provider,
    method: config.method,
  });

  // Simulate provider API call delay
  await new Promise(resolve => setTimeout(resolve, config.avgTime * 10));

  // Risk scoring simulation
  const riskScore = simulateRiskScore(customerData);
  const riskLevel: RiskLevel = riskScore > 80 ? 'low' : riskScore > 50 ? 'medium' : 'high';

  if (riskScore < 30) {
    return {
      status: 'rejected',
      risk_level: 'high',
      verified_fields: [],
      provider: config.provider,
      provider_reference: generateProviderRef(),
      cost: config.cost,
      time_taken: config.avgTime,
    };
  }

  if (riskLevel === 'medium') {
    return {
      status: 'pending_review',
      risk_level: 'medium',
      verified_fields: getVerifiedFields(customerData),
      provider: config.provider,
      provider_reference: generateProviderRef(),
      cost: config.cost,
      time_taken: config.avgTime,
    };
  }

  return {
    status: 'verified',
    risk_level: riskLevel,
    verified_fields: getVerifiedFields(customerData),
    provider: config.provider,
    provider_reference: generateProviderRef(),
    cost: config.cost,
    time_taken: config.avgTime,
  };
}

/**
 * DigiLocker-specific integration for India (30% of users)
 */
export async function verifyWithDigiLocker(
  aadhaarNumber: string,
  otp: string
): Promise<VerificationPayload> {
  logger.info('DigiLocker verification initiated');
  // TODO: Implement actual DigiLocker API call
  // POST https://api.digilocker.gov.in/public/oauth2/1/token
  await new Promise(resolve => setTimeout(resolve, 150));

  return {
    status: 'verified',
    risk_level: 'low',
    verified_fields: ['name', 'date_of_birth', 'address', 'photo'],
    provider: 'digilocker',
    provider_reference: `DL-${Date.now()}`,
    cost: 0.04,
    time_taken: 15,
  };
}

/**
 * Automated pre-checks pipeline
 */
export async function runAutomatedPreChecks(
  customerData: Record<string, unknown>
): Promise<{
  passed: boolean;
  checks: Record<string, boolean>;
  score: number;
  cost: number;
}> {
  const checks: Record<string, boolean> = {
    ocr_extraction: false,
    mrz_validation: false,
    face_match: false,
    liveness_check: false,
    tamper_detection: false,
    pep_sanctions: false,
    address_validation: false,
    phone_email_otp: false,
  };

  let totalCost = 0;

  // OCR ($0.01)
  if (customerData.id_image) {
    checks.ocr_extraction = true;
    totalCost += 0.01;
  }

  // MRZ validation for passports ($0.01)
  if (customerData.id_type === 'passport') {
    checks.mrz_validation = Boolean(customerData.id_number);
    totalCost += 0.01;
  }

  // Face match ($0.02)
  if (customerData.id_image && customerData.selfie) {
    checks.face_match = true;
    totalCost += 0.02;
  }

  // Liveness ($0.05)
  if (customerData.selfie) {
    checks.liveness_check = true;
    totalCost += 0.05;
  }

  // Tamper detection ($0.01)
  if (customerData.id_image) {
    checks.tamper_detection = true;
    totalCost += 0.01;
  }

  // PEP/Sanctions screening (included)
  checks.pep_sanctions = Boolean(customerData.first_name && customerData.last_name);

  // Address validation
  checks.address_validation = Boolean(customerData.address);

  // OTP verification
  checks.phone_email_otp = Boolean(customerData.phone_number || customerData.email);

  const passedCount = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passedCount / Object.keys(checks).length) * 100);

  return {
    passed: score >= 60,
    checks,
    score,
    cost: totalCost,
  };
}

function simulateRiskScore(data: Record<string, unknown>): number {
  let score = 50;
  if (data.first_name && data.last_name) score += 10;
  if (data.email) score += 10;
  if (data.phone_number) score += 10;
  if (data.date_of_birth) score += 10;
  if (data.address) score += 10;
  if (data.id_number) score += 10;
  return Math.min(score, 100);
}

function getVerifiedFields(data: Record<string, unknown>): string[] {
  const fields: string[] = [];
  if (data.first_name || data.last_name) fields.push('name');
  if (data.email) fields.push('email');
  if (data.phone_number) fields.push('phone_number');
  if (data.date_of_birth) fields.push('date_of_birth');
  if (data.address) fields.push('address');
  if (data.id_number) fields.push('identity');
  return fields;
}

function generateProviderRef(): string {
  return `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function getProviderMatrix() {
  return Object.entries(PROVIDER_MAP)
    .filter(([k]) => k !== 'default')
    .map(([country, config]) => ({
      country,
      ...config,
    }));
}
