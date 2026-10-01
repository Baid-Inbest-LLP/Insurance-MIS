import mongoose from 'mongoose';
import { MASTER_SECTIONS, MASTER_SLUGS } from '../constants/masterSlugs.js';

// Each master category is one document. Values are embedded so a category and
// its values can be read and maintained together.
const masterItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
      validate: {
        validator: (value) => !/[\u0000-\u001F\u007F]/.test(value),
        message: 'Name contains invalid characters',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: 'throw' },
);

const masterSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: MASTER_SECTIONS,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: MASTER_SLUGS,
    },
    items: { type: [masterItemSchema], default: [] },
  },
  { timestamps: true, strict: 'throw' },
);

// A category can exist once in LI and once in GI, with independent items.
masterSchema.index({ section: 1, slug: 1 }, { unique: true });

export const Master = mongoose.model('Master', masterSchema);
