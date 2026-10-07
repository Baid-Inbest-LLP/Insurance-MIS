import { z } from 'zod';
import { objectId } from './common.validator.js';

export const lookupsQuerySchema = z
  .object({ department: objectId('department').optional() })
  .strict();
