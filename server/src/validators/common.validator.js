import { z } from 'zod';

export const objectId = (label) =>
  z
    .string({ required_error: `${label[0].toUpperCase()}${label.slice(1)} is required` })
    .regex(/^[a-f\d]{24}$/i, `Invalid ${label} id`);
