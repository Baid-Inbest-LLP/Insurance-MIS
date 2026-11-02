// Indian financial year runs April to March; reports walk months in that order.
export const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
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

export const getIndiaBusinessDate = (date = new Date()) => {
  const { year, month, day } = indiaCalendarParts(date);
  return new Date(Date.UTC(year, month - 1, day));
};

// Indian financial year: April to March.
export const getFinancialYear = (date = new Date()) => {
  const { year, month } = indiaCalendarParts(date);
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
};

export const getFinancialYearStart = (date = new Date()) => {
  const { year, month } = indiaCalendarParts(date);
  const startYear = month < 4 ? year - 1 : year;
  return new Date(Date.UTC(startYear, 3, 1));
};

// Return financial year and calendar month from a date.
export const getFinancialYearAndMonth = (date) => {
  const { month } = indiaCalendarParts(date);
  return {
    financialYear: getFinancialYear(date),
    month,
  };
};

// The financial year immediately before the given one: "2026-27" to "2025-26".
export const getPreviousFinancialYear = (financialYear) => {
  const startYear = Number(financialYear.slice(0, 4)) - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

// Every FY-scoped endpoint defaults to the current financial year when the client omits it.
export const resolveFinancialYear = (requestedFinancialYear) =>
  requestedFinancialYear || getFinancialYear();
