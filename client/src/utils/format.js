export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const wordsUnderHundred = (n) => {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = n % 10 ? ` ${ONES[n % 10]}` : '';
  return `${tens}${ones}`;
};

const wordsUnderThousand = (n) => {
  if (n < 100) return wordsUnderHundred(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[hundreds]} Hundred${rest ? ` ${wordsUnderHundred(rest)}` : ''}`;
};

const numberToIndianWords = (n) => {
  if (n === 0) return 'Zero';

  let num = Math.floor(n);
  let result = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore) result += `${wordsUnderHundred(crore)} Crore `;
  if (lakh) result += `${wordsUnderHundred(lakh)} Lakh `;
  if (thousand) result += `${wordsUnderThousand(thousand)} Thousand `;
  if (num) {
    result += (result && num < 100 ? 'and ' : '') + wordsUnderThousand(num);
  }

  return result.trim();
};

/** Indian Rupees amount in words (e.g. "Rupees Five Thousand Only"). */
export const formatAmountInWords = (value) => {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let words = numberToIndianWords(rupees);
  words = `Rupees ${words}`;
  if (paise > 0) {
    words += ` and ${numberToIndianWords(paise)} Paise`;
  }
  words += ' Only';

  return num < 0 ? `Minus ${words}` : words;
};

/** Compact Indian rupee figure for chart axes (e.g. ₹12L, ₹1.2Cr). */
export const formatCompactCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

export const formatNumber = (value, decimals = 2) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercent = (value) => {
  const num = Number(value) || 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

const MONTH_ABBREV = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
};

export const abbreviateMonth = (month) => {
  if (!month) return null;
  const trimmed = String(month).trim();
  const fromMap = MONTH_ABBREV[trimmed.toLowerCase()];
  if (fromMap) return fromMap;
  if (trimmed.length <= 3) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed.slice(0, 3).charAt(0).toUpperCase() + trimmed.slice(1, 3).toLowerCase();
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Paid':
      return 'green';
    case 'Pending':
      return 'yellow';
    case 'Cancelled':
      return 'red';
    default:
      return 'gray';
  }
};

export const getApprovalStatusColor = (status) => {
  switch (status) {
    case 'Completed':
      return 'green';
    case 'Approved':
      return 'blue';
    case 'Pending':
      return 'orange';
    default:
      return 'gray';
  }
};

export const getApprovalStatusBadge = (status) => {
  switch (status) {
    case 'Completed':
      return 'badge-completed';
    case 'Approved':
      return 'badge-approved';
    case 'Pending':
      return 'badge-pending';
    case 'Draft':
      return 'badge-draft';
    default:
      return 'badge bg-gray-100 text-gray-700';
  }
};

export const getPaymentStatusBadge = (status) => {
  switch (status) {
    case 'Paid':
      return 'badge-paid';
    case 'Pending':
      return 'badge-payment-pending';
    case 'Cancelled':
      return 'badge-cancelled';
    default:
      return 'badge bg-gray-100 text-gray-700';
  }
};

export const getApprovalStatusGradient = (status) => {
  switch (status) {
    case 'Completed':
      return 'from-blue-500 to-indigo-600';
    case 'Approved':
      return 'from-emerald-500 to-green-600';
    case 'Pending':
      return 'from-amber-500 to-orange-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};
