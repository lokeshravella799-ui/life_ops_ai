const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  role: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.string().optional(),
  preferredStudyTime: z.string().optional(),
  interests: z.array(z.string()).optional(),
  preferences: z.record(z.any()).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema
};
