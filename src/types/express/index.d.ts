import { User } from '@prisma/client';

// Creating a shared type for authenticated requests
export interface AuthRequest extends Request {
  user?: Omit<User, 'password'>;
}
