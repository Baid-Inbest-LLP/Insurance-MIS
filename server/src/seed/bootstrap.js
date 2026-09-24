import { User } from '../models/User.js';

const DEFAULT_SUPERADMIN = {
  name: 'Super Admin',
  userName: (process.env.SUPERADMIN_USERNAME || 'superadmin').trim().toLowerCase(),
  password: process.env.SUPERADMIN_PASSWORD || 'super123',
  role: 'superadmin',
};

/** Creates the superadmin login when no superadmin exists yet. */
export const ensureSuperAdminAccount = async () => {
  if (await User.exists({ role: 'superadmin' })) return;

  const byUserName = await User.findOne({ userName: DEFAULT_SUPERADMIN.userName });
  if (byUserName) {
    byUserName.role = 'superadmin';
    await byUserName.save({ validateBeforeSave: false });
    console.log(`Upgraded ${DEFAULT_SUPERADMIN.userName} to superadmin`);
    return;
  }

  await User.create(DEFAULT_SUPERADMIN);
  console.log(
    `Created superadmin: ${DEFAULT_SUPERADMIN.userName} / ${DEFAULT_SUPERADMIN.password}`,
  );
};
