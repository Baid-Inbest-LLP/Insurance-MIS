import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, unique: true },
		code: { type: String, trim: true, unique: true, sparse: true },
		email: { type: String, trim: true },
		phone: { type: String, trim: true },
		taxId: { type: String, trim: true },
		gst: { type: String, trim: true },
		pan: { type: String, trim: true },
		tan: { type: String, trim: true },
		pTax: { type: String, trim: true },
		website: { type: String, trim: true },
		tradeLicense: { type: String, trim: true },
		irdaiNumber: { type: String, trim: true },
		msmeNumber: { type: String, trim: true },
		cinOrLlp: { type: String, trim: true },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

export const Company = mongoose.model("Company", companySchema);
