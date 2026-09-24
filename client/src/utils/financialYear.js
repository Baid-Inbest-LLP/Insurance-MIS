// Indian financial year runs April (month index 3) to March.
export const getCurrentFinancialYear = (date = new Date()) => {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
};

// Most-recent-first list of FY strings for a picker, e.g. ["2025-26", "2024-25", ...].
export const getFinancialYearOptions = (count = 5) => {
  const [startYear] = getCurrentFinancialYear().split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const year = startYear - i;
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  });
};
