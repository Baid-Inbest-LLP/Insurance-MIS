import { z } from 'zod';
import { MASTER_SLUGS } from '../constants/masterSlugs.js';
import { objectId } from './common.validator.js';

export const masterSlugParamsSchema = z.object({
  departmentId: objectId('department'),
  slug: z.enum(MASTER_SLUGS, { message: 'Unsupported master slug' }),
}).strict();

export const masterItemParamsSchema = masterSlugParamsSchema.extend({
  itemId: objectId('item'),
}).strict();

const itemNameSchema = z
  .string({ required_error: 'Name is required', invalid_type_error: 'Name must be a string' })
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must not exceed 120 characters')
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), {
    message: 'Name contains invalid characters',
  });

export const createMasterItemSchema = z
  .object({
    name: itemNameSchema,
    isActive: z.boolean({ invalid_type_error: 'isActive must be a boolean' }).optional(),
  })
  .strict();

export const updateMasterItemSchema = z
  .object({
    name: itemNameSchema.optional(),
    isActive: z.boolean({ invalid_type_error: 'isActive must be a boolean' }).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a name or active status to update',
  });

export const masterItemsQuerySchema = z
  .object({
    activeOnly: z.enum(['true', 'false']).optional(),
  })
  .strict();
