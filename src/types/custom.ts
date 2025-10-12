import { Request } from 'express-serve-static-core';
import { User } from '../generated/prisma';

// Create a reusable authenticated request type
export interface AuthRequest extends Request {
  user?: Omit<User, 'password'>;
  body: any; // Ensure body is always available
}
