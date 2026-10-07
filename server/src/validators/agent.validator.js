import { z } from 'zod';
import { objectId } from './common.validator.js';

const agentNameSchema = z
  .string({ required_error: 'Name is required', invalid_type_error: 'Name must be a string' })
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must not exceed 120 characters')
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value), {
    message: 'Name contains invalid characters',
  });

const isActiveSchema = z.boolean({ invalid_type_error: 'isActive must be a boolean' });

export const createAgentSchema = z
  .object({ name: agentNameSchema, isActive: isActiveSchema.optional() })
  .strict();

export const updateAgentSchema = z
  .object({ name: agentNameSchema.optional(), isActive: isActiveSchema.optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a name or active status to update',
  });

export const agentParamsSchema = z.object({ id: objectId('agent') }).strict();

export const agentsQuerySchema = z
  .object({ activeOnly: z.enum(['true', 'false']).optional() })
  .strict();
