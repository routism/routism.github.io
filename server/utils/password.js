import crypto from 'crypto';

const KEY_LEN = 64;

/**
 * Hash a plaintext password using scrypt with a random salt.
 * Stored format: "<saltHex>:<hashHex>"
 */
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored "<saltHex>:<hashHex>" value.
 */
export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  const hash = crypto.scryptSync(plain, salt, KEY_LEN);
  const storedBuf = Buffer.from(hashHex, 'hex');
  if (storedBuf.length !== hash.length) return false;
  return crypto.timingSafeEqual(hash, storedBuf);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
