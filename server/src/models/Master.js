import mongoose from 'mongoose';
import { DEPARTMENTS } from '../constants/departments.js';
import { MASTER_SLUGS } from '../constants/masterSlugs.js';

// Each master category is one document. Values are embedded so a category and its values can be read and maintained together.
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
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: 'throw' },
);

const masterSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: DEPARTMENTS,
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
masterSchema.index({ department: 1, slug: 1 }, { unique: true });

export const Master = mongoose.model('Master', masterSchema);
