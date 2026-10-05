import { z } from 'zod';
import { objectId } from './common.validator.js';

const departmentCodeSchema = z
  .string({ required_error: 'Department code is required', invalid_type_error: 'Department code must be a string' })
  .trim()
  .toUpperCase()
  .min(1, 'Department code is required')
  .max(20, 'Department code must not exceed 20 characters')
  .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'Department code may only contain letters, numbers and hyphens');

const departmentNameSchema = z
  .string({ required_error: 'Name is required', invalid_type_error: 'Name must be a string' })
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must not exceed 120 characters');

export const createDepartmentSchema = z
  .object({
    name: departmentNameSchema,
    code: departmentCodeSchema,
  })
  .strict();

export const updateDepartmentSchema = z
  .object({
    name: departmentNameSchema.optional(),
    code: departmentCodeSchema.optional(),
    isActive: z.boolean({ invalid_type_error: 'isActive must be a boolean' }).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a name, code or active status to update',
  });

export const departmentParamsSchema = z
  .object({
    id: objectId('department'),
  })
  .strict();

export const departmentsQuerySchema = z
  .object({
    activeOnly: z.enum(['true', 'false']).optional(),
  })
  .strict();
