import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, USER_ROLES, isStaffRole } from "../constants/roles.js";

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		userName: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: { type: String, required: true, minlength: 6, select: false },
		role: {
			type: String,
			enum: USER_ROLES,
			required: true,
		},
		departments: {
			type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
			default: [],
			validate: {
				validator(departments) {
					return !isStaffRole(this.role) || departments.length > 0;
				},
				message: "At least one department is required for this role",
			},
		},
		isActive: { type: Boolean, default: true },
		// Mixed: legacy string or string[] of active refresh tokens (multi-session).
		refreshToken: { type: mongoose.Schema.Types.Mixed, select: false },
		lastLogin: { type: Date },
		// Set whenever password changes; used to invalidate tokens issued before this point.
		passwordChangedAt: { type: Date, select: false },
	},
	{ timestamps: true },
);

userSchema.index({ role: 1 });
// One active HOD per department: no two active HODs can share a department.
userSchema.index(
	{ departments: 1 },
	{
		unique: true,
		partialFilterExpression: { role: ROLES.HOD, isActive: true },
	},
);

userSchema.pre("save", async function hashPassword(next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 12);
	// Skip on document creation — no prior tokens exist yet to invalidate.
	if (!this.isNew) this.passwordChangedAt = new Date();
	next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
	return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function toJSON() {
	const obj = this.toObject();
	delete obj.password;
	delete obj.refreshToken;
	return obj;
};

export const User = mongoose.model("User", userSchema);
