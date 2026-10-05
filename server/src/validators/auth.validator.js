import { z } from 'zod';
import { DEPARTMENTS } from '../constants/departments.js';
import { ASSIGNABLE_ROLES, isStaffRole } from '../constants/roles.js';

export const loginSchema = z.object({
  userName: z.string().trim().min(1, 'User name is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    userName: z.string().trim().min(1, 'User name is required').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(ASSIGNABLE_ROLES, {
      message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
    }),
    locationCity: z.string().trim().min(1, 'Location is required').optional(),
    department: z
      .enum(DEPARTMENTS, { message: `Department must be one of: ${DEPARTMENTS.join(', ')}` })
      .optional(),
  })
  .refine((value) => !isStaffRole(value.role) || value.locationCity, {
    message: 'Location is required for this role',
    path: ['locationCity'],
  })
  .refine((value) => !isStaffRole(value.role) || value.department, {
    message: 'Department is required for this role',
    path: ['department'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});
