export const ROLES = {
	SUPERADMIN: "superadmin",
	ADMIN: "admin",
	HOD: "hod",
	EMP_PREMIUM: "emp-premium",
	EMP_COMMISSION: "emp-commission",
};

const ROLE_LABELS = {
	[ROLES.SUPERADMIN]: "Superadmin",
	[ROLES.ADMIN]: "Admin",
	[ROLES.HOD]: "HOD",
	[ROLES.EMP_PREMIUM]: "Premium Employee",
	[ROLES.EMP_COMMISSION]: "Commission Employee",
};

// Roles a superadmin can give to a new user; there is only one superadmin.
export const ASSIGNABLE_ROLES = [
	ROLES.ADMIN,
	ROLES.HOD,
	ROLES.EMP_PREMIUM,
	ROLES.EMP_COMMISSION,
];

// Roles tied to a city and a department.
export const STAFF_ROLES = [ROLES.HOD, ROLES.EMP_PREMIUM, ROLES.EMP_COMMISSION];

export const DEPARTMENTS = [
	{ value: "gi", label: "General Insurance (GI)" },
	{ value: "li", label: "Life Insurance (LI)" },
];

export const isSuperAdmin = (role) => role === ROLES.SUPERADMIN;
export const isStaffRole = (role) => STAFF_ROLES.includes(role);
export const roleLabel = (role) => ROLE_LABELS[role] || role || "";
export const departmentLabel = (department) =>
	DEPARTMENTS.find((d) => d.value === department)?.label || "";
