export const TRANSACTION_KINDS = { GI: 'gi', LI: 'li' };

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

export const FREQUENCIES = ['monthly', 'quarterly', 'half-yearly', 'yearly', 'single'];

// Transaction field -> the department master list it points into.
export const MASTER_FIELDS = {
  insurer: { slug: 'insurer', label: 'Insurer' },
  businessType: { slug: 'business-type', label: 'Business type' },
  lob: { slug: 'lob', label: 'Line of business' },
  productType: { slug: 'product-type', label: 'Product type' },
};
