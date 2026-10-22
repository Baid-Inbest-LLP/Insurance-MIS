import mongoose from 'mongoose';

// Agents are shared by every department, so they live in their own collection.
const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: 'throw' },
);

// Names are unique ignoring case; soft-deleted agents are excluded.
agentSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
    partialFilterExpression: { deletedAt: { $type: 'null' } },
  },
);

export const Agent = mongoose.model('Agent', agentSchema);
