# 🛡️ Stellar KYC — Reusable Identity Infrastructure

> Verify once, onboard everywhere. Consent-based KYC credential sharing for the Stellar ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![SEP-12](https://img.shields.io/badge/SEP-12-brightgreen)](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md)
[![W3C VC](https://img.shields.io/badge/W3C-Verifiable%20Credentials-blue)](https://www.w3.org/TR/vc-data-model-2.0/)

## Overview

Stellar KYC eliminates the $75-100, 2.5-hour burden of repeat KYC across Stellar anchors.

| Before | After |
|--------|-------|
| KYC per anchor: $15-20 | First verification: $0.50-3.00 |
| Time per anchor: 30+ min | Reuse time: < 2 minutes |
| Drop-off rate: 40-50% | Consent approval: 30 seconds |
| Data in 5+ databases | One encrypted credential |

## Architecture

```
User Wallet (Stellar Keypair owns credentials)
     │ SEP-10 Auth
     ▼
Consent & Request Interface
     │
     ▼
Identity & Credential Registry (Core Service)
  ├─ Issue W3C Verifiable Credentials
  ├─ Store encrypted (user-key only)
  ├─ Manage consent grants
  ├─ Verify credential proofs
  └─ Maintain immutable audit log
     │
  ┌──┴──────────────┐
  │                 │
Database         Stellar
(encrypted VCs)  (hashes)
```

## Project Structure

```
stellar-kyc/
├── backend/              # Node.js/TypeScript REST API
│   ├── src/
│   │   ├── index.ts      # Express app entry point
│   │   ├── routes/
│   │   │   ├── identity.ts   # SEP-12 KYC endpoints
│   │   │   └── consent.ts    # Consent management
│   │   ├── services/
│   │   │   ├── credentials.ts  # W3C VC issuance
│   │   │   ├── consent.ts      # Consent lifecycle
│   │   │   ├── encryption.ts   # NaCl/libsodium
│   │   │   └── kycProvider.ts  # Global provider routing
│   │   ├── middleware/
│   │   │   └── auth.ts      # SEP-10 + API key auth
│   │   └── db/
│   │       ├── schema.sql   # Full PostgreSQL schema
│   │       └── connection.ts
│   └── Dockerfile
├── frontend/             # React dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx       # Marketing page
│   │   │   ├── Dashboard.tsx     # User identity hub
│   │   │   ├── KYCSubmit.tsx     # Multi-step KYC form
│   │   │   ├── ConsentPage.tsx   # Consent manager
│   │   │   ├── AuditLog.tsx      # Access history
│   │   │   └── AnchorDashboard.tsx  # Anchor tools
│   │   └── services/api.ts       # API client
│   └── Dockerfile
├── sdk/                  # @stellarkyc/sdk TypeScript package
│   └── src/index.ts
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### 1. Clone & Install

```bash
git clone https://github.com/stellar-kyc/stellar-kyc
cd stellar-kyc

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# SDK
cd ../sdk && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### 3. Initialize Database

```bash
psql -U postgres -c "CREATE DATABASE stellar_kyc;"
psql -U postgres -d stellar_kyc -f backend/src/db/schema.sql
```

### 4. Run Development Servers

```bash
# Terminal 1: Backend API
cd backend && npm run dev
# → http://localhost:3001

# Terminal 2: Frontend
cd frontend && npm run dev
# → http://localhost:3000
```

### 5. Docker (Recommended)

```bash
cp backend/.env.example .env
docker-compose up -d
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api/v1

## API Reference

### Submit KYC (SEP-12)
```http
PUT /api/v1/identity/customer
X-Stellar-Account: GUSER...

{
  "first_name": "Maria",
  "last_name": "Doe",
  "email": "maria@example.com",
  "country": "IN",
  "id_type": "passport",
  "id_number": "A1234567",
  "user_public_key": "base64_public_key"
}
```

### Request Consent (Anchor)
```http
POST /api/v1/identity/consent/request
Authorization: Bearer <anchor_api_key>

{
  "stellar_account": "GUSER...",
  "fields_requested": ["name", "email", "risk_level"],
  "expires_in": 2592000
}
```

### Verify Credential
```http
GET /api/v1/identity/verify-proof?consent_id=consent_abc123
Authorization: Bearer <anchor_api_key>

Response: {
  "is_valid": true,
  "verified": true,
  "risk_level": "low",
  "fields_verified": ["name", "email", "risk_level"],
  "credential_age_days": 45
}
```

## SDK Usage

```bash
npm install @stellarkyc/sdk
```

```typescript
import { StellarKYC } from '@stellarkyc/sdk';

const kyc = new StellarKYC({
  apiKey: 'your_api_key',
  network: 'testnet'
});

// Request consent
const consent = await kyc.requestConsent({
  account: userStellarAccount,
  fields: ['name', 'email', 'risk_level']
});

// Wait for user to approve in their wallet, then verify
const result = await kyc.verify(consent.consentRequestId);

if (result.isValid && result.riskLevel === 'low') {
  // Instantly onboard user — no document collection needed!
}
```

## W3C Verifiable Credential Format

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "KYCCredential"],
  "issuer": { "id": "did:stellar:GANCHOR_PLATFORM" },
  "credentialSubject": {
    "id": "did:stellar:GUSER123",
    "name": "Maria Doe",
    "risk_classification": "low",
    "verified_fields": ["name", "email", "identity"]
  },
  "proof": {
    "type": "StellarSorobanSignature",
    "verificationMethod": "did:stellar:GANCHOR_PLATFORM#key-1"
  }
}
```

## Global Provider Coverage

| Region | Share | Provider | Cost | Time |
|--------|-------|----------|------|------|
| India | 30% | DigiLocker/Aadhaar | $0.04 | 15s |
| Philippines | 25% | PhilSys | $0.50 | 20s |
| Latin America | 20% | Signzy | $1.50 | 45s |
| Africa | 10% | Smile ID | $0.80 | 25s |
| EU/US | 10% | Onfido/Jumio | $3.00 | 60s |

**Blended Average: $0.95 / 35s**

## Security

- **User-Key Encryption**: NaCl box encryption with user's Stellar keypair. Platform cannot access plaintext.
- **Zero Knowledge**: Anchors receive verified attributes without raw documents.
- **Granular Consent**: Field-level, time-limited, revocable consent tokens.
- **Immutable Audit**: Append-only access log satisfying GDPR Article 15 & financial regulations.
- **Forward Secrecy**: Ephemeral server keypairs per credential.

## Compliance

- ✅ GDPR (Article 15, 17, 20)
- ✅ CCPA transparency requirements
- ✅ Financial services audit trails (7-year retention)
- ✅ AML/KYC regulatory requirements
- ✅ SEP-10 / SEP-12 Stellar standards

## Roadmap

- **Phase 1 (MVP)**: Core API, consent system, 5 provider integrations
- **Phase 2 (Month 8+)**: ZK proofs for selective disclosure (prove age >18 without revealing DOB)
- **Phase 3 (Month 12+)**: Soroban smart contracts, DIDs, IPFS storage
- **Phase 4**: Biometric credentials, video KYC, multi-sig corporate accounts

## Funding

Seeking $80K-$150K for 4-month MVP development.

| Funder | Amount | Fit |
|--------|--------|-----|
| Stellar Community Fund | $80-150K | Best fit |
| UNDP Innovation | $100-200K | Humanitarian |
| EU Digital Identity | $200-500K | GDPR-aligned |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT © Stellar KYC Contributors

---

**Contact**: hello@stellarkyc.org | [developers.stellarkyc.org](https://developers.stellarkyc.org)
