import { z } from 'zod';
import { ASSIGNABLE_ROLES } from '../constants/roles.js';
import { objectId } from './common.validator.js';
import { departmentIdsSchema } from './department.validator.js';

export const assignableRoleSchema = z.enum(ASSIGNABLE_ROLES, {
  message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
});

export const userParamsSchema = z
  .object({
    id: objectId('user'),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').optional(),
    userName: z.string().trim().min(1, 'User name is required').toLowerCase().optional(),
    role: assignableRoleSchema.optional(),
    isActive: z.boolean({ invalid_type_error: 'isActive must be a boolean' }).optional(),
    locationCity: objectId('location').optional(),
    departments: departmentIdsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });
