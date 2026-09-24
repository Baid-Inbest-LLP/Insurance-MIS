export const ROLES = {
  SUPERADMIN: 'superadmin',
  ACCOUNTANT: 'accountant',
};

export const USER_ROLES = Object.values(ROLES);

export const isSuperAdmin = (role) => role === ROLES.SUPERADMIN;
export const isAccountant = (role) => role === ROLES.ACCOUNTANT;
