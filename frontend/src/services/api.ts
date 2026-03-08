import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export function createApiClient(stellarAccount?: string, apiKey?: string): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (stellarAccount) headers['X-Stellar-Account'] = stellarAccount;
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const client = axios.create({ baseURL: API_BASE, headers, timeout: 30000 });

  client.interceptors.response.use(
    (res) => res,
    (error) => {
      const message = error.response?.data?.error?.message || error.message;
      return Promise.reject(new Error(message));
    }
  );
  return client;
}

export interface KYCFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
  city: string;
  country: string;
  id_type: 'passport' | 'national_id' | 'drivers_license';
  id_number: string;
  user_public_key: string;
}

export interface ConsentRequestData {
  stellar_account: string;
  fields_requested: string[];
  expires_in?: number;
}

export interface KYCStatus {
  id: string;
  status: string;
  risk_level: string;
  verified_at: number;
  expires_at: number;
  fields_verified: string[];
  credential_id: string;
  credential_hash: string;
}

export interface ConsentGrant {
  id: string;
  anchor_address: string;
  fields_shared: string[];
  granted_at: number;
  expires_at: number;
  revoked_at: number | null;
}

export interface AuditEntry {
  id: number;
  consent_id: string;
  anchor_address: string;
  fields_accessed: string[];
  accessed_at: number;
}

// =============================================
// User APIs
// =============================================

export async function submitKYC(
  stellarAccount: string,
  data: KYCFormData
): Promise<{ id: string; status: string; credential_id?: string }> {
  const client = createApiClient(stellarAccount);
  const res = await client.put('/identity/customer', data);
  return res.data;
}

export async function getKYCStatus(stellarAccount: string): Promise<KYCStatus> {
  const client = createApiClient(undefined, import.meta.env.VITE_DEMO_API_KEY);
  const res = await client.get(`/identity/customer?stellar_account=${stellarAccount}`);
  return res.data;
}

export async function approveConsent(
  stellarAccount: string,
  consentRequestId: string,
  signature: string
): Promise<{ consent_id: string; fields_approved: string[]; valid_until: number }> {
  const client = createApiClient(stellarAccount);
  const res = await client.post('/identity/consent/approve', {
    consent_request_id: consentRequestId,
    signature,
  });
  return res.data;
}

export async function denyConsent(
  stellarAccount: string,
  consentRequestId: string
): Promise<void> {
  const client = createApiClient(stellarAccount);
  await client.post('/identity/consent/deny', { consent_request_id: consentRequestId });
}

export async function revokeConsent(
  stellarAccount: string,
  consentId: string
): Promise<void> {
  const client = createApiClient(stellarAccount);
  await client.delete(`/identity/consent/${consentId}`);
}

export async function listConsents(stellarAccount: string): Promise<{
  active: ConsentGrant[];
  expired: ConsentGrant[];
  revoked: ConsentGrant[];
}> {
  const client = createApiClient(stellarAccount);
  const res = await client.get('/identity/consent/list');
  return res.data;
}

export async function getPendingConsents(stellarAccount: string) {
  const client = createApiClient(stellarAccount);
  const res = await client.get('/identity/consent/pending');
  return res.data.requests;
}

export async function getAuditLog(
  stellarAccount: string,
  limit = 20
): Promise<{ entries: AuditEntry[]; total: number }> {
  const client = createApiClient(stellarAccount);
  const res = await client.get(`/identity/consent/audit?limit=${limit}`);
  return res.data;
}

// =============================================
// Anchor APIs (with API key)
// =============================================

export async function requestConsent(
  apiKey: string,
  data: ConsentRequestData
): Promise<{
  consent_request_id: string;
  anchor: string;
  fields: string[];
  user_action_required: boolean;
  expires_at: number;
}> {
  const client = createApiClient(undefined, apiKey);
  const res = await client.post('/identity/consent/request', data);
  return res.data;
}

export async function verifyProof(
  apiKey: string,
  consentId: string
): Promise<{
  is_valid: boolean;
  verified: boolean;
  account: string;
  risk_level: string;
  fields_verified: string[];
}> {
  const client = createApiClient(undefined, apiKey);
  const res = await client.get(`/identity/verify-proof?consent_id=${consentId}`);
  return res.data;
}

export async function getCustomerByAnchor(
  apiKey: string,
  stellarAccount: string
): Promise<KYCStatus> {
  const client = createApiClient(undefined, apiKey);
  const res = await client.get(`/identity/customer?stellar_account=${stellarAccount}`);
  return res.data;
}
