import { z } from 'zod';
import { isStaffRole } from '../constants/roles.js';
import { departmentIdsSchema } from './department.validator.js';
import { assignableRoleSchema } from './user.validator.js';

export const loginSchema = z.object({
  userName: z.string().trim().min(1, 'User name is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    userName: z.string().trim().min(1, 'User name is required').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: assignableRoleSchema,
    locationCity: z.string().trim().min(1, 'Location is required').optional(),
    departments: departmentIdsSchema.optional(),
  })
  .refine((value) => !isStaffRole(value.role) || value.locationCity, {
    message: 'Location is required for this role',
    path: ['locationCity'],
  })
  .refine((value) => !isStaffRole(value.role) || value.departments, {
    message: 'At least one department is required for this role',
    path: ['departments'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});
