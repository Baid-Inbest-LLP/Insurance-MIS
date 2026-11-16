import { z } from 'zod';
import { date, sourceSchema } from './transaction.validator.js';
import { objectId } from './common.validator.js';
import { SOURCES } from '../constants/transactions.js';

// Every report is for one department and an optional policy-date range, and can be narrowed by branch, LOB,
// insurer, business type, agent or source.
export const reportQuerySchema = z
  .object({
    department: objectId('department'),
    from: date('From date').optional(),
    to: date('To date').optional(),
    branch: objectId('branch').optional(),
    lob: objectId('line of business').optional(),
    insurer: objectId('insurer').optional(),
    businessType: objectId('business type').optional(),
    agent: objectId('agent').optional(),
    // These are plain transaction fields, not master-item ids. They are used
    // by the shared report filter bar and dashboard drill-down links.
    source: z.enum(SOURCES, { message: `Source must be one of: ${SOURCES.join(', ')}` }).optional(),
    productType: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine(({ from, to }) => !from || !to || to >= from, {
    path: ['to'],
    message: 'To date must be on or after the from date',
  });
