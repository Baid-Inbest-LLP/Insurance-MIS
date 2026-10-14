import mongoose from 'mongoose';
import { TRANSACTION_KINDS } from '../constants/transactions.js';

const { ObjectId, Mixed } = mongoose.Schema.Types;

// A half-filled transaction form that its creator saved to finish later. `data` holds the form's values
// as typed, so none of it is validated; it becomes a Transaction only when the form is submitted.
const transactionDraftSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: Object.values(TRANSACTION_KINDS), required: true },
    department: { type: ObjectId, ref: 'Department', required: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    data: { type: Mixed, default: {} },
  },
  { timestamps: true, strict: 'throw' },
);

transactionDraftSchema.index({ createdBy: 1, updatedAt: -1 });

export const TransactionDraft = mongoose.model('TransactionDraft', transactionDraftSchema);
