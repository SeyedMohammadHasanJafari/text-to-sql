import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

export const registerSchema = z.object({
  email,
  // Upper bound protects the (deliberately expensive) hash function from DoS.
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});
