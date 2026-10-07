import mongoose from 'mongoose';
import { COMMISSION_STATUSES, FREQUENCIES, SOURCES, TRANSACTION_KINDS } from '../constants/transactions.js';

const { ObjectId } = mongoose.Schema.Types;

const amount = (options = {}) => ({ type: Number, required: true, min: 0, ...options });

// Master list items are embedded in a `masters` document, so they are stored as plain ids.
const masterItemId = (options = {}) => ({ type: ObjectId, required: true, ...options });

// One collection for GI and LI; `kind` picks the extra fields.
const transactionSchema = new mongoose.Schema(
  {
    department: { type: ObjectId, ref: 'Department', required: true },
    branch: { type: ObjectId, ref: 'Branch', required: true },
    location: { type: String, required: true, trim: true, maxlength: 100 },
    officeCode: { type: String, trim: true, maxlength: 30 },

    policyDate: { type: Date, required: true },
    entryDate: { type: Date, required: true, default: Date.now },
    policyNo: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
    clientName: { type: String, required: true, trim: true, uppercase: true, maxlength: 120 },

    insurer: masterItemId(),
    businessType: masterItemId(),
    lob: masterItemId(),
    agent: {
      type: ObjectId,
      ref: 'Agent',
      required() {
        return this.kind === TRANSACTION_KINDS.LI;
      },
    },
    source: { type: String, enum: SOURCES, required: true },

    netPremium: amount(),
    gst: amount(),
    premium: amount(),
    reference: { type: String, trim: true, maxlength: 200 },

    createdBy: { type: ObjectId, ref: 'User', required: true },
    updatedBy: { type: ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: 'throw', discriminatorKey: 'kind' },
);

// Unique per insurer, policy number and date; soft-deleted records are excluded.
transactionSchema.index(
  { insurer: 1, policyNo: 1, policyDate: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $type: 'null' } } },
);
transactionSchema.index({ department: 1, policyDate: -1 });
transactionSchema.index({ insurer: 1, policyDate: -1 });
transactionSchema.index({ lob: 1, policyDate: -1 });
transactionSchema.index({ agent: 1, policyDate: -1 });
transactionSchema.index({ branch: 1, policyDate: -1 });

// Commission is optional on a transaction. Amounts and percentages are entered by hand, so both are stored.
const percentage = () => ({ type: Number, required: true, min: 0, max: 100 });
const commissionStatus = { type: String, enum: COMMISSION_STATUSES, required: true };

const giCommissionSchema = new mongoose.Schema(
  {
    odCommission: amount(),
    tpCommission: amount(),
    totalCommission: amount(),
    odCommissionPercent: percentage(),
    tpCommissionPercent: percentage(),
    totalCommissionPercent: percentage(),
    status: commissionStatus,
  },
  { _id: false, strict: 'throw' },
);

const liCommissionSchema = new mongoose.Schema(
  { amount: amount(), percent: percentage(), status: commissionStatus },
  { _id: false, strict: 'throw' },
);

const giSchema = new mongoose.Schema(
  {
    clientGst: { type: String, trim: true, uppercase: true, maxlength: 15 },
    vehicleNo: { type: String, trim: true, uppercase: true, maxlength: 20 },
    maker: { type: String, trim: true, maxlength: 60 },
    model: { type: String, trim: true, maxlength: 60 },
    mfgDate: { type: Date },
    ncb: { type: Number, min: 0, max: 100 },
    policyPeriodFrom: { type: Date, required: true },
    policyPeriodTo: { type: Date, required: true },
    odPremium: amount({ required: false, default: 0 }),
    thirdPartyCover: amount({ required: false, default: 0 }),
    agentStampDuty: amount({ required: false, default: 0 }),
    commission: { type: giCommissionSchema },
  },
  { strict: 'throw' },
);

const liSchema = new mongoose.Schema(
  {
    dateOfBirth: { type: Date, required: true },
    productType: masterItemId(),
    commencementDate: { type: Date, required: true },
    paymentTermYears: { type: Number, required: true, min: 1, validate: Number.isInteger },
    policyTermYears: { type: Number, required: true, min: 1, validate: Number.isInteger },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    nextDueDate: { type: Date },
    actualPaymentDate: { type: Date, required: true },
    premiumPerMonth: amount(),
    sumAssured: amount(),
    commission: { type: liCommissionSchema },
  },
  { strict: 'throw' },
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
export const GiTransaction = Transaction.discriminator('GiTransaction', giSchema, {
  value: TRANSACTION_KINDS.GI,
});
export const LiTransaction = Transaction.discriminator('LiTransaction', liSchema, {
  value: TRANSACTION_KINDS.LI,
});
