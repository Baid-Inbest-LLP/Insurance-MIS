export const TRANSACTION_KINDS = { GI: 'gi', LI: 'li' };

export const KIND_LABELS = { gi: 'GI', li: 'LI' };

export const SOURCES = [
  'Sales',
  'Agents',
  'Direct',
  'Telecalling',
  'MD',
  'Referral',
  'Marketing',
  'Others',
];

export const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'single', label: 'Single' },
];

export const COMMISSION_STATUSES = [
  { value: 'received', label: 'Received', className: 'commission-status-received' },
  { value: 'pending', label: 'Pending', className: 'commission-status-pending' },
];
