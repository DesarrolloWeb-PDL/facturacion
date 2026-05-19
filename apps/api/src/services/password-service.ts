import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, expectedKey] = passwordHash.split(':');

  if (!salt || !expectedKey) {
    return false;
  }

  const actualKey = scryptSync(password, salt, KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedKey, 'hex');

  return expectedBuffer.length === actualKey.length && timingSafeEqual(expectedBuffer, actualKey);
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
