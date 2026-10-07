import { z } from 'zod';
import { FREQUENCIES, SOURCES, TRANSACTION_KINDS } from '../constants/transactions.js';
import { objectId } from './common.validator.js';

const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Forms send '' for an empty optional field; treat it as not provided.
const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const text = (label, max) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must not exceed ${max} characters`);

const optionalText = (label, max) => z.preprocess(emptyToUndefined, text(label, max).optional());

const date = (label) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be a date` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be in YYYY-MM-DD format`)
    .refine((value) => {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, `${label} is not a valid date`)
    .transform((value) => new Date(value));

const optionalDate = (label) => z.preprocess(emptyToUndefined, date(label).optional());

const amount = (label) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .refine((value) => Number(value.toFixed(2)) === value, `${label} can have at most 2 decimal places`);

const years = (label) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be at least 1`);

const sharedFields = {
  department: objectId('department'),
  branch: objectId('branch'),
  location: text('Location', 100),
  officeCode: optionalText('Office code', 30),
  policyDate: date('Policy date'),
  entryDate: optionalDate('Date of entry'),
  policyNo: text('Policy number', 60),
  clientName: text('Client name', 120),
  insurer: objectId('insurer'),
  businessType: objectId('business type'),
  lob: objectId('line of business'),
  source: z.enum(SOURCES, { message: `Source must be one of: ${SOURCES.join(', ')}` }),
  netPremium: amount('Net premium'),
  gst: amount('GST'),
  premium: amount('Premium'),
  reference: optionalText('Reference', 200),
};

const giSchema = z.object({
  ...sharedFields,
  kind: z.literal(TRANSACTION_KINDS.GI),
  agent: z.preprocess(emptyToUndefined, objectId('agent').optional()),
  clientGst: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(GST_PATTERN, 'Client GST is not a valid GST number')
      .optional(),
  ),
  vehicleNo: optionalText('Vehicle number', 20),
  maker: optionalText('Maker', 60),
  model: optionalText('Model', 60),
  mfgDate: optionalDate('MFG date'),
  ncb: z.preprocess(
    emptyToUndefined,
    z
      .number({ invalid_type_error: 'NCB must be a number' })
      .min(0, 'NCB cannot be negative')
      .max(100, 'NCB cannot be more than 100')
      .optional(),
  ),
  policyPeriodFrom: date('Policy period from'),
  policyPeriodTo: date('Policy period to'),
  odPremium: amount('OD premium').default(0),
  thirdPartyCover: amount('Third-party cover').default(0),
  agentStampDuty: amount('Agent stamp duty').default(0),
});

const liSchema = z.object({
  ...sharedFields,
  kind: z.literal(TRANSACTION_KINDS.LI),
  agent: objectId('agent'),
  dateOfBirth: date('Date of birth'),
  productType: objectId('product type'),
  commencementDate: date('Date of commencement'),
  paymentTermYears: years('Payment term'),
  policyTermYears: years('Policy term'),
  frequency: z.enum(FREQUENCIES, { message: `Frequency must be one of: ${FREQUENCIES.join(', ')}` }),
  nextDueDate: optionalDate('Next due date'),
  actualPaymentDate: date('Actual payment date'),
  premiumPerMonth: amount('Premium per month'),
  sumAssured: amount('Sum assured'),
});

// Used to create a transaction and to update one (a full replacement of its fields).
export const transactionBodySchema = z
  .discriminatedUnion('kind', [giSchema, liSchema], {
    errorMap: () => ({ message: `Kind must be one of: ${Object.values(TRANSACTION_KINDS).join(', ')}` }),
  })
  .superRefine((transaction, ctx) => {
    const addIssue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

    if (transaction.kind === TRANSACTION_KINDS.GI) {
      const { odPremium, thirdPartyCover, agentStampDuty, netPremium } = transaction;
      if (netPremium.toFixed(2) !== (odPremium + thirdPartyCover + agentStampDuty).toFixed(2)) {
        addIssue('netPremium', 'Net premium must equal OD premium + third-party cover + agent stamp duty');
      }
      if (transaction.policyPeriodTo < transaction.policyPeriodFrom) {
        addIssue('policyPeriodTo', 'Policy period end must be on or after its start');
      }
    }

    if (transaction.kind === TRANSACTION_KINDS.LI && transaction.commencementDate < transaction.dateOfBirth) {
      addIssue('commencementDate', 'Date of commencement cannot be before date of birth');
    }

    if (transaction.premium.toFixed(2) !== (transaction.netPremium + transaction.gst).toFixed(2)) {
      addIssue('premium', 'Premium must equal net premium + GST');
    }
  });

export const transactionParamsSchema = z.object({ id: objectId('transaction') }).strict();

export const listTransactionsQuerySchema = z
  .object({
    kind: z.enum(Object.values(TRANSACTION_KINDS)).optional(),
    department: objectId('department').optional(),
    branch: objectId('branch').optional(),
    insurer: objectId('insurer').optional(),
    lob: objectId('line of business').optional(),
    agent: objectId('agent').optional(),
    from: date('From date').optional(),
    to: date('To date').optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
