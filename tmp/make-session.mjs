import dotenv from 'dotenv';
import { SignJWT } from 'jose';

dotenv.config();

const secret = process.env.AUTH_SECRET;
if (!secret) {
  throw new Error('AUTH_SECRET missing');
}

const userId = Number(process.env.PERF_DIAG_USER_ID || '2');
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
const payload = {
  user: { id: userId },
  expires: expiresAt.toISOString()
};

const key = new TextEncoder().encode(secret);
const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setJti(`diag-${Date.now()}`)
  .setExpirationTime(expiresAt)
  .sign(key);

console.log(token);
