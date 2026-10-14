import { z } from 'zod';
import { TRANSACTION_KINDS } from '../constants/transactions.js';
import { objectId } from './common.validator.js';

const MAX_FIELDS = 80;
const MAX_VALUE_LENGTH = 500;

// The form's values as typed: field name -> text. A draft is incomplete by design, so nothing else is checked.
const draftData = z
  .record(
    z.string().regex(/^[A-Za-z]{1,40}$/, 'Invalid field name'),
    z.string().max(MAX_VALUE_LENGTH, `A value must not exceed ${MAX_VALUE_LENGTH} characters`),
  )
  .refine((data) => Object.keys(data).length <= MAX_FIELDS, `A draft can hold at most ${MAX_FIELDS} fields`);

export const draftBodySchema = z
  .object({
    kind: z.enum(Object.values(TRANSACTION_KINDS), {
      message: `Kind must be one of: ${Object.values(TRANSACTION_KINDS).join(', ')}`,
    }),
    department: objectId('department'),
    data: draftData,
  })
  .strict();

export const draftParamsSchema = z.object({ id: objectId('draft') }).strict();
