import { z } from 'zod';

export const objectId = (label) => z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${label} id`);
