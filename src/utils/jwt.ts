import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (userId: string): string => {
  // use any casts to avoid type-definition mismatches between jsonwebtoken and @types
  return (jwt as any).sign({ userId }, JWT_SECRET as any, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  return (jwt as any).verify(token, JWT_SECRET as any) as { userId: string };
};
