import { z } from 'zod';
import { date } from './transaction.validator.js';
import { objectId } from './common.validator.js';

export const DASHBOARD_SECTIONS = ['overview', 'monthly', 'products', 'companies', 'sources', 'offices', 'business-types', 'recent', 'years'];

// Dashboard filters are deliberately optional.  The server derives the user's
// permitted departments from their authenticated account; this optional value
// only narrows that already-authorised scope.
export const dashboardQuerySchema = z
  .object({
    department: objectId('department').optional(),
    from: date('From date').optional(),
    to: date('To date').optional(),
    branch: objectId('branch').optional(),
    lob: objectId('line of business').optional(),
    insurer: objectId('insurer').optional(),
    businessType: objectId('business type').optional(),
    agent: objectId('agent').optional(),
    section: z.enum(DASHBOARD_SECTIONS).optional(),
  })
  .strict()
  .refine(({ from, to }) => !from || !to || to >= from, {
    path: ['to'],
    message: 'To date must be on or after the from date',
  });
