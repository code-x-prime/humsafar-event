import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.ACCESS_JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_LIFE });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_LIFE });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.ACCESS_JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
}
