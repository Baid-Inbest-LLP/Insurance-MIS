import { z } from 'zod';
import { date } from './transaction.validator.js';
import { objectId } from './common.validator.js';

// Every report is for one department and an optional policy-date range, and can be narrowed to a branch, line of
// business, insurer, business type, product type (LI) or agent.
export const reportQuerySchema = z
  .object({
    department: objectId('department'),
    from: date('From date').optional(),
    to: date('To date').optional(),
    branch: objectId('branch').optional(),
    lob: objectId('line of business').optional(),
    insurer: objectId('insurer').optional(),
    businessType: objectId('business type').optional(),
    productType: objectId('product type').optional(),
    agent: objectId('agent').optional(),
  })
  .strict()
  .refine(({ from, to }) => !from || !to || to >= from, {
    path: ['to'],
    message: 'To date must be on or after the from date',
  });
