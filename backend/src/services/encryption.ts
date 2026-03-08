import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';
import { createHash } from 'crypto';
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
  const credentialBytes = encodeUTF8(credentialJson);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  let userPublicKey: Uint8Array;
  try {
    userPublicKey = decodeBase64(userPublicKeyBase64);
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
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encrypted),
    credential_hash: credentialHash,
    server_public_key: encodeBase64(serverKeypair.publicKey),
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
  const userPrivateKey = decodeBase64(userPrivateKeyBase64);
  const serverPublicKey = decodeBase64(encryptedPackage.server_public_key);
  const nonce = decodeBase64(encryptedPackage.nonce);
  const ciphertext = decodeBase64(encryptedPackage.ciphertext);

  const decrypted = nacl.box.open(
    ciphertext,
    nonce,
    serverPublicKey,
    userPrivateKey
  );

  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }

  return JSON.parse(decodeUTF8(decrypted));
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
  return encodeBase64(bytes).replace(/[+/=]/g, '').substring(0, 32);
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
  return encodeBase64(bytes).replace(/[+/=]/g, '').substring(0, 24);
}

/**
 * Sign data with a keypair (for server-side credential proofs)
 */
export function signCredential(data: string): {
  signature: string;
  publicKey: string;
} {
  const keypair = nacl.sign.keyPair();
  const messageBytes = encodeUTF8(data);
  const signature = nacl.sign(messageBytes, keypair.secretKey);

  return {
    signature: encodeBase64(signature),
    publicKey: encodeBase64(keypair.publicKey),
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
  const messageBytes = encodeUTF8(value);
  const encrypted = nacl.secretbox(messageBytes, nonce, secretKey);

  return JSON.stringify({
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encrypted),
  });
}

/**
 * Decrypt a single field
 */
export function decryptField(encryptedField: string, secretKey: Uint8Array): string {
  const { nonce, ciphertext } = JSON.parse(encryptedField);
  const decrypted = nacl.secretbox.open(
    decodeBase64(ciphertext),
    decodeBase64(nonce),
    secretKey
  );
  if (!decrypted) throw new Error('Field decryption failed');
  return decodeUTF8(decrypted);
}
