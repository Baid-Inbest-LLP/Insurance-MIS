import mongoose from "mongoose";

const locationCitySchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

locationCitySchema.index(
	{ name: 1 },
	{
		unique: true,
		collation: { locale: "en", strength: 2 },
		name: "locationcity_name_ci",
	},
);

export const LocationCity = mongoose.model("LocationCity", locationCitySchema);
