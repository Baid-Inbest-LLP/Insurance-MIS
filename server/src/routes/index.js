import { Router } from 'express';
import authRoutes from './auth.routes.js';
import masterRoutes from './master.routes.js';
import companyRoutes from './company.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Insurance MIS API is running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/masters', masterRoutes);
router.use('/companies', companyRoutes);

export default router;
