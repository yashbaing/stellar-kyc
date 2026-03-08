-- Stellar KYC Database Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- KYC Customers Table
-- =============================================
CREATE TABLE IF NOT EXISTS kyc_customers (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  stellar_account VARCHAR(56) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(2),
  id_type VARCHAR(20) CHECK (id_type IN ('passport', 'national_id', 'drivers_license')),
  id_number VARCHAR(100),
  id_image_url TEXT,
  selfie_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'pending_review', 'verified', 'rejected', 'expired', 'revoked')),
  risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
  verified_at BIGINT,
  expires_at BIGINT,
  verified_by VARCHAR(100),
  rejection_reason TEXT,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_customers_stellar ON kyc_customers(stellar_account);
CREATE INDEX IF NOT EXISTS idx_customers_status ON kyc_customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON kyc_customers(email);

-- =============================================
-- Credentials Table (Encrypted VCs)
-- =============================================
CREATE TABLE IF NOT EXISTS credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  stellar_account VARCHAR(56) NOT NULL,
  verifier_address VARCHAR(56) NOT NULL,
  encrypted_data BYTEA NOT NULL,
  encryption_nonce VARCHAR(128) NOT NULL,
  server_public_key VARCHAR(128) NOT NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  verified_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked_at BIGINT,
  credential_hash VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  UNIQUE(stellar_account, verifier_address)
);

CREATE INDEX IF NOT EXISTS idx_credentials_stellar ON credentials(stellar_account);
CREATE INDEX IF NOT EXISTS idx_credentials_expires ON credentials(expires_at);
CREATE INDEX IF NOT EXISTS idx_credentials_hash ON credentials(credential_hash);

-- =============================================
-- Consent Requests Table (Pending)
-- =============================================
CREATE TABLE IF NOT EXISTS consent_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  stellar_account VARCHAR(56) NOT NULL,
  credential_id VARCHAR(36),
  requesting_anchor VARCHAR(56) NOT NULL,
  fields_requested TEXT NOT NULL, -- JSON array
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_req_stellar ON consent_requests(stellar_account);
CREATE INDEX IF NOT EXISTS idx_consent_req_anchor ON consent_requests(requesting_anchor);

-- =============================================
-- Consent Grants Table
-- =============================================
CREATE TABLE IF NOT EXISTS consent_grants (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  consent_request_id VARCHAR(36) NOT NULL,
  credential_id VARCHAR(36) NOT NULL,
  anchor_address VARCHAR(56) NOT NULL,
  fields_shared TEXT NOT NULL, -- JSON array
  user_signature TEXT NOT NULL,
  granted_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked_at BIGINT,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
  FOREIGN KEY (consent_request_id) REFERENCES consent_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_grants_credential ON consent_grants(credential_id);
CREATE INDEX IF NOT EXISTS idx_grants_anchor ON consent_grants(anchor_address);
CREATE INDEX IF NOT EXISTS idx_grants_expires ON consent_grants(expires_at);

-- =============================================
-- Access Audit Log Table
-- =============================================
CREATE TABLE IF NOT EXISTS access_audit_log (
  id BIGSERIAL PRIMARY KEY,
  consent_id VARCHAR(36) NOT NULL,
  anchor_address VARCHAR(56) NOT NULL,
  fields_accessed TEXT NOT NULL, -- JSON array
  accessed_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  user_ip VARCHAR(45),
  FOREIGN KEY (consent_id) REFERENCES consent_grants(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_consent ON access_audit_log(consent_id);
CREATE INDEX IF NOT EXISTS idx_audit_anchor ON access_audit_log(anchor_address);
CREATE INDEX IF NOT EXISTS idx_audit_accessed ON access_audit_log(accessed_at);

-- =============================================
-- Revocation Registry
-- =============================================
CREATE TABLE IF NOT EXISTS revocation_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  credential_id VARCHAR(36) NOT NULL,
  revoked_by VARCHAR(56) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  revoked_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  FOREIGN KEY (credential_id) REFERENCES credentials(id)
);

CREATE INDEX IF NOT EXISTS idx_revoke_credential ON revocation_events(credential_id);

-- =============================================
-- Anchor Registry
-- =============================================
CREATE TABLE IF NOT EXISTS anchor_registry (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  stellar_address VARCHAR(56) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  api_key_hash VARCHAR(64) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter', 'growth', 'enterprise')),
  monthly_limit INTEGER NOT NULL DEFAULT 1000,
  current_usage INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  webhook_url TEXT,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_anchor_address ON anchor_registry(stellar_address);
CREATE INDEX IF NOT EXISTS idx_anchor_apikey ON anchor_registry(api_key_hash);

-- =============================================
-- Stellar Blockchain References
-- =============================================
CREATE TABLE IF NOT EXISTS blockchain_references (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  credential_id VARCHAR(36) NOT NULL UNIQUE,
  stellar_tx_hash VARCHAR(64) NOT NULL,
  ipfs_hash VARCHAR(64),
  anchored_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
  FOREIGN KEY (credential_id) REFERENCES credentials(id)
);

-- =============================================
-- Trigger: auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = EXTRACT(EPOCH FROM NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kyc_customers_updated
  BEFORE UPDATE ON kyc_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER credentials_updated
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER anchor_registry_updated
  BEFORE UPDATE ON anchor_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Seed: Demo Anchor
-- =============================================
INSERT INTO anchor_registry (stellar_address, name, api_key_hash, tier, monthly_limit)
VALUES (
  'GANCHOR_DEMO_ADDRESS_123456789012345678901234567890',
  'Demo Anchor',
  encode(sha256('demo-api-key-2024'::bytea), 'hex'),
  'growth',
  5000
) ON CONFLICT (stellar_address) DO NOTHING;
