import app from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { ensureSuperAdminAccount } from './seed/bootstrap.js';

const start = async () => {
  await connectDatabase();
  await ensureSuperAdminAccount();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Insurance MIS Server running on port ${config.port} [${config.env}]`);
  });
};

start();
