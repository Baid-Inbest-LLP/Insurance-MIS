import mongoose from 'mongoose';
import { config } from './index.js';

const ATLAS_CHECKLIST = [
  'Atlas checklist:',
  '  1. MONGODB_URI must include a database name, e.g. ...mongodb.net/insurance_mis_db',
  '  2. Atlas → Network Access → allow your IP (or 0.0.0.0/0 for dev)',
  '  3. Confirm username/password in Database Access',
].join('\n');

/** Options tuned for MongoDB Atlas on Windows (TLS / IPv6 issues). */
export const getConnectionOptions = () => ({
  serverSelectionTimeoutMS: 15000,
  autoSelectFamily: false,
  family: 4,
});

export const connectDatabase = async () => {
  const uri = config.mongodbUri;
  if (!uri) {
    console.error(
      'MongoDB connection error: MONGODB_URI is not set.\n' +
        'Provide a full MongoDB connection string in your environment.',
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, getConnectionOptions());
    console.log(`MongoDB connected successfully (database: ${mongoose.connection.name})`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}\n\n${ATLAS_CHECKLIST}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});
