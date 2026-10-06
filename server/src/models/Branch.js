import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
	{
		company: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Company",
			required: true,
		},
		label: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		code: { type: String, trim: true },
		street: { type: String, trim: true },
		city: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "LocationCity",
			required: true,
		},
		state: { type: String, trim: true },
		zipCode: { type: String, trim: true },
		country: { type: String, trim: true, default: "India" },
		isDefault: { type: Boolean, default: false },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

branchSchema.index({ company: 1, label: 1 }, { unique: true });

export const Branch = mongoose.model("Branch", branchSchema);
