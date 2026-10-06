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

// Roles that belong to one or more departments.
export const STAFF_ROLES = [ROLES.HOD, ROLES.EMP_PREMIUM, ROLES.EMP_COMMISSION];

export const isSuperAdmin = (role) => role === ROLES.SUPERADMIN;
export const isHod = (role) => role === ROLES.HOD;
export const isStaffRole = (role) => STAFF_ROLES.includes(role);
