import { TRANSACTION_KINDS } from '../constants/transactions';

const DATE_FIELDS = new Set([
  'policyDate',
  'entryDate',
  'mfgDate',
  'policyPeriodFrom',
  'policyPeriodTo',
  'dateOfBirth',
  'commencementDate',
  'nextDueDate',
  'actualPaymentDate',
]);

const today = () => new Date().toLocaleDateString('en-CA');
const dateInput = (value) => (value ? String(value).slice(0, 10) : '');
const text = (value) => (value === undefined || value === null ? '' : String(value));
const amount = (value) => (value === '' || value === undefined ? undefined : Number(value));

export const emptyTransactionValues = () => ({
  department: '',
  branch: '',
  location: '',
  officeCode: '',
  policyDate: '',
  entryDate: today(),
  policyNo: '',
  clientName: '',
  insurer: '',
  businessType: '',
  lob: '',
  agent: '',
  source: '',
  reference: '',
  netPremium: '',
  gst: '',
  premium: '',
  // GI
  clientGst: '',
  vehicleNo: '',
  maker: '',
  model: '',
  mfgDate: '',
  ncb: '',
  policyPeriodFrom: '',
  policyPeriodTo: '',
  odPremium: '0',
  thirdPartyCover: '0',
  agentStampDuty: '0',
  // LI
  dateOfBirth: '',
  productType: '',
  commencementDate: '',
  paymentTermYears: '',
  policyTermYears: '',
  frequency: '',
  nextDueDate: '',
  actualPaymentDate: '',
  premiumPerMonth: '',
  sumAssured: '',
});

// Turns a transaction from the API into the form's string values.
export const valuesFromTransaction = (transaction) => {
  const values = emptyTransactionValues();
  const fields = {
    department: transaction.department._id,
    branch: transaction.branch._id,
    insurer: transaction.insurer?._id,
    businessType: transaction.businessType?._id,
    lob: transaction.lob?._id,
    agent: transaction.agent?._id,
    productType: transaction.productType?._id,
  };

  for (const key of Object.keys(values)) {
    const value = key in fields ? fields[key] : transaction[key];
    values[key] = DATE_FIELDS.has(key) ? dateInput(value) : text(value ?? values[key]);
  }
  return values;
};

// Turns the form's values into the body the API expects, for the chosen kind only.
export const buildTransactionPayload = (values) => {
  const shared = {
    kind: values.kind,
    department: values.department,
    branch: values.branch,
    location: values.location,
    officeCode: values.officeCode,
    policyDate: values.policyDate,
    entryDate: values.entryDate,
    policyNo: values.policyNo,
    clientName: values.clientName,
    insurer: values.insurer,
    businessType: values.businessType,
    lob: values.lob,
    agent: values.agent,
    source: values.source,
    reference: values.reference,
    netPremium: amount(values.netPremium),
    gst: amount(values.gst),
    premium: amount(values.premium),
  };

  if (values.kind === TRANSACTION_KINDS.GI) {
    return {
      ...shared,
      clientGst: values.clientGst,
      vehicleNo: values.vehicleNo,
      maker: values.maker,
      model: values.model,
      mfgDate: values.mfgDate,
      ncb: amount(values.ncb),
      policyPeriodFrom: values.policyPeriodFrom,
      policyPeriodTo: values.policyPeriodTo,
      odPremium: amount(values.odPremium) ?? 0,
      thirdPartyCover: amount(values.thirdPartyCover) ?? 0,
      agentStampDuty: amount(values.agentStampDuty) ?? 0,
    };
  }

  return {
    ...shared,
    dateOfBirth: values.dateOfBirth,
    productType: values.productType,
    commencementDate: values.commencementDate,
    paymentTermYears: amount(values.paymentTermYears),
    policyTermYears: amount(values.policyTermYears),
    frequency: values.frequency,
    nextDueDate: values.nextDueDate,
    actualPaymentDate: values.actualPaymentDate,
    premiumPerMonth: amount(values.premiumPerMonth),
    sumAssured: amount(values.sumAssured),
  };
};
