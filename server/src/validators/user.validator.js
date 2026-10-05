import { z } from 'zod';
import { objectId } from './common.validator.js';

export const userParamsSchema = z
  .object({
    id: objectId('user'),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').optional(),
    userName: z.string().trim().min(1, 'User name is required').toLowerCase().optional(),
    isActive: z.boolean({ invalid_type_error: 'isActive must be a boolean' }).optional(),
    locationCity: objectId('location').optional(),
    department: objectId('department').optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });
