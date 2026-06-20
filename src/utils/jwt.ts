import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  userId: string;
  role: string;
  is2faVerified?: boolean;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '1d', // 1 day
  });
};

export const generateRefreshToken = (payload: { userId: string }): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7 days
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
};
