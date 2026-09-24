import dotenv from "dotenv";
import path from "path";

dotenv.config();

const DB_NAME = process.env.MONGODB_DB_NAME || "insurance_mis_db";

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

// Longer-lived access tokens in dev for convenience; short-lived in production.
const defaultAccessTokenExpiry = isProduction ? "15m" : "5m";

/** Ensure the Atlas URI has a database name + standard query params. */
export const normalizeMongoUri = (rawUri) => {
	if (!rawUri) return null;

	let uri = rawUri.trim();

	if (!/\.mongodb\.net\/[a-zA-Z0-9_-]+/.test(uri)) {
		uri = uri.replace(/\.mongodb\.net\/?/, `.mongodb.net/${DB_NAME}`);
	}
	if (!uri.includes("retryWrites=")) {
		uri += uri.includes("?")
			? "&retryWrites=true&w=majority"
			: "?retryWrites=true&w=majority";
	}

	return uri;
};

export const config = {
	env: NODE_ENV,
	port: parseInt(process.env.PORT, 10) || 5000,
	mongodbUri: normalizeMongoUri(process.env.MONGODB_URI),
	jwt: {
		secret: process.env.JWT_SECRET || "dev-secret-change-me",
		refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
		expiresIn: process.env.JWT_EXPIRES_IN || defaultAccessTokenExpiry,
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
	},
	clientUrl: process.env.FRONTEND_URL || "http://localhost:5173",
	upload: {
		dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads"),
		maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
		allowedMime: [
			"application/pdf",
			"image/jpeg",
			"image/png",
			"image/jpg",
		],
	},
	smtp: {
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT, 10) || 587,
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
		from:
			process.env.SMTP_FROM ||
			"Insurance MIS <noreply@insurance-mis.local>",
	},
};
