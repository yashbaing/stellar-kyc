import nacl from 'tweetnacl';
import { createHash } from 'crypto';

/** Decode bytes to UTF-8 string (tweetnacl-util types are loose) */
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
/** Encode string to bytes as Uint8Array */
function utf8ToBytes(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'utf8'));
}
/** Decode base64 to Uint8Array */
function b64ToBytes(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'base64'));
}
import { EncryptedPackage, W3CVerifiableCredential } from '../types';
import { logger } from './logger';

/**
 * Encrypts credential data using NaCl box (asymmetric encryption)
 * Only the user's private key can decrypt their credentials
 */
export async function encryptCredential(
  credentialData: W3CVerifiableCredential | Record<string, unknown>,
  userPublicKeyBase64: string
): Promise<EncryptedPackage> {
  const serverKeypair = nacl.box.keyPair();
  const credentialJson = JSON.stringify(credentialData);
  const credentialBytes = utf8ToBytes(credentialJson);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  let userPublicKey: Uint8Array;
  try {
    userPublicKey = b64ToBytes(userPublicKeyBase64);
  } catch {
    throw new Error('Invalid user public key format');
  }

  const encrypted = nacl.box(
    credentialBytes,
    nonce,
    userPublicKey,
    serverKeypair.secretKey
  );

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  const credentialHash = createHash('sha256').update(credentialJson).digest('hex');

  logger.debug('Credential encrypted', {
    hash: credentialHash,
    size: encrypted.length,
  });

  return {
    nonce: Buffer.from(nonce).toString('base64'),
    ciphertext: Buffer.from(encrypted).toString('base64'),
    credential_hash: credentialHash,
    server_public_key: Buffer.from(serverKeypair.publicKey).toString('base64'),
  };
}

/**
 * Decrypts credential data using user's private key (client-side only)
 * This should only be called client-side, included here for SDK usage
 */
export function decryptCredential(
  encryptedPackage: EncryptedPackage,
  userPrivateKeyBase64: string
): Record<string, unknown> {
  const userPrivateKey = b64ToBytes(userPrivateKeyBase64);
  const serverPublicKey = b64ToBytes(encryptedPackage.server_public_key);
  const nonce = b64ToBytes(encryptedPackage.nonce);
  const ciphertext = b64ToBytes(encryptedPackage.ciphertext);

  const decrypted = nacl.box.open(
    ciphertext,
    nonce,
    serverPublicKey,
    userPrivateKey
  );

  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }

  return JSON.parse(bytesToUtf8(decrypted));
}

/**
 * Verifies that a credential hash matches its encrypted package
 */
export function verifyCredentialHash(
  encryptedPackage: EncryptedPackage,
  expectedHash: string
): boolean {
  return encryptedPackage.credential_hash === expectedHash;
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  const bytes = nacl.randomBytes(32);
  return Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '').substring(0, 32);
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a secure random token for consent requests
 */
export function generateConsentToken(): string {
  const bytes = nacl.randomBytes(16);
  return Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '').substring(0, 24);
}

/**
 * Sign data with a keypair (for server-side credential proofs)
 */
export function signCredential(data: string): {
  signature: string;
  publicKey: string;
} {
  const keypair = nacl.sign.keyPair();
  const messageBytes = utf8ToBytes(data);
  const signature = nacl.sign(messageBytes, keypair.secretKey);

  return {
    signature: Buffer.from(signature).toString('base64'),
    publicKey: Buffer.from(keypair.publicKey).toString('base64'),
  };
}

/**
 * Verify a SEP-10 signature (simplified)
 * In production, use full SEP-10 challenge verification
 */
export function verifySEP10Signature(
  _stellarAccount: string,
  _signature: string
): boolean {
  // TODO: Implement full SEP-10 challenge-response verification
  // For now, validates format only
  if (!_signature || _signature.length < 20) return false;
  return true;
}

/**
 * Encrypt field-level data for selective disclosure
 */
export function encryptField(value: string, secretKey: Uint8Array): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = utf8ToBytes(value);
  const encrypted = nacl.secretbox(messageBytes, nonce, secretKey);

  return JSON.stringify({
    nonce: Buffer.from(nonce).toString('base64'),
    ciphertext: Buffer.from(encrypted).toString('base64'),
  });
}

/**
 * Decrypt a single field
 */
export function decryptField(encryptedField: string, secretKey: Uint8Array): string {
  const { nonce, ciphertext } = JSON.parse(encryptedField);
  const decrypted = nacl.secretbox.open(
    b64ToBytes(ciphertext),
    b64ToBytes(nonce),
    secretKey
  );
  if (!decrypted) throw new Error('Field decryption failed');
  return bytesToUtf8(decrypted);
}
