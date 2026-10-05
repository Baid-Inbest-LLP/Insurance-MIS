export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  HOD: 'hod',
  EMP_PREMIUM: 'emp-premium',
  EMP_COMMISSION: 'emp-commission',
};

export const USER_ROLES = Object.values(ROLES);

// Roles that can be given to a new user; there is only one superadmin.
export const ASSIGNABLE_ROLES = USER_ROLES.filter((role) => role !== ROLES.SUPERADMIN);

// Roles tied to a city and a department; their data access is limited to that city.
export const STAFF_ROLES = [ROLES.HOD, ROLES.EMP_PREMIUM, ROLES.EMP_COMMISSION];

export const isSuperAdmin = (role) => role === ROLES.SUPERADMIN;
export const isStaffRole = (role) => STAFF_ROLES.includes(role);
