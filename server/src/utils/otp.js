import crypto from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

export function compareOtp(code, hash) {
  return bcrypt.compare(code, hash);
}
