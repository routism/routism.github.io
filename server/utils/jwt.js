import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

/**
 * Sign a JWT-like token: header.payload.signature (HS256).
 * `expiresInSeconds` is optional; omit for a non-expiring token.
 */
export function signToken(payload, secret, expiresInSeconds) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000) };
  if (expiresInSeconds) body.exp = body.iat + expiresInSeconds;

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify a token's signature and expiry. Throws on failure.
 */
export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    throw new Error('Malformed token');
  }
  const [headerEncoded, payloadEncoded, signature] = token.split('.');

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64urlDecode(payloadEncoded));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }
  return payload;
}
