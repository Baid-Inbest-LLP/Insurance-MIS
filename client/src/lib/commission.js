import { COMMISSION_VIEW_ROLES, isHod, isStaffRole } from '../constants/roles';

// Premium employees never see commission.
export const canViewCommission = (user) => Boolean(user) && COMMISSION_VIEW_ROLES.includes(user.role);

// Same rule as the server. Without a transaction (adding one) any role but premium employee may.
// For an existing one: a HOD inside their departments, a commission employee on their own entries.
export const canManageCommission = (user, transaction) => {
  if (!canViewCommission(user)) return false;
  if (!isStaffRole(user.role) || !transaction) return true;
  if (!user.departments.some((department) => department._id === transaction.department._id)) return false;
  return isHod(user.role) || transaction.createdBy?._id === user._id;
};
