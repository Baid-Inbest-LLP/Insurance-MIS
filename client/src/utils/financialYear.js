export const INDIA_TIME_ZONE = 'Asia/Kolkata';

const indiaCalendarParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => ['year', 'month', 'day'].includes(part.type)).map((part) => [part.type, Number(part.value)]));
};

// Indian financial year runs April to March in the application's business timezone.
export const getCurrentFinancialYear = (date = new Date()) => {
  const { year, month } = indiaCalendarParts(date);
  const startYear = month >= 4 ? year : year - 1;
  const nextYear = startYear + 1;
  return `${startYear}-${String(nextYear % 100).padStart(2, '0')}`;
};

export const getFinancialYearRange = (financialYear = getCurrentFinancialYear(), today = new Date()) => {
  const startYear = Number(String(financialYear).slice(0, 4));
  const currentStartYear = Number(getCurrentFinancialYear(today).slice(0, 4));
  const { year, month, day } = indiaCalendarParts(today);
  return {
    from: `${startYear}-04-01`,
    to: startYear === currentStartYear ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : `${startYear + 1}-03-31`,
  };
};

export const getFinancialYearStartYear = (date = new Date()) => Number(getCurrentFinancialYear(date).slice(0, 4));

// Most-recent-first list of FY strings for a picker, e.g. ["2025-26", "2024-25", ...].
export const getFinancialYearOptions = (count = 5) => {
  const [startYear] = getCurrentFinancialYear().split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const year = startYear - i;
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  });
};
