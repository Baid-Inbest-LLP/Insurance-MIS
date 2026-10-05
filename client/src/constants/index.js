export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 10;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'insurance_mis_access_token',
  REFRESH_TOKEN: 'insurance_mis_refresh_token',
  USER: 'insurance_mis_user',
  THEME: 'insurance_mis_theme',
};

export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  TRANSACTIONS: '/transactions',
  REPORTS: '/reports',
  REPORT_LOB_WISE: '/reports/lob-wise',
  REPORT_OFFICE_WISE: '/reports/office-wise',
  REPORT_AGENT_WISE: '/reports/agent-wise',
  REPORT_INSURER_WISE: '/reports/insurer-wise',
  CONTROL_CENTER: '/control-center',
  CONTROL_CENTER_COMPANIES: '/control-center/companies',
  CONTROL_CENTER_DEPARTMENTS: '/control-center/departments',
  SETTINGS: '/settings',
};

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
