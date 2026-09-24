// Indian financial year runs April to March; reports walk months in that order.
export const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

// Indian financial year: April to March.
export const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
};

// Return financial year and calendar month from a date.
export const getFinancialYearAndMonth = (date) => {
  const entryDate = new Date(date);
  return {
    financialYear: getFinancialYear(entryDate),
    month: entryDate.getMonth() + 1,
  };
};

// The financial year immediately before the given one: "2026-27" to "2025-26".
export const getPreviousFinancialYear = (financialYear) => {
  const startYear = Number(financialYear.slice(0, 4)) - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

// Every FY-scoped endpoint defaults to the current financial year when the client omits it.
export const resolveFinancialYear = (requestedFinancialYear) => requestedFinancialYear || getFinancialYear();
