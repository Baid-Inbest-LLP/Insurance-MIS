import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { dashboardQuerySchema } from '../validators/dashboard.validator.js';
import { getPremiumDashboard } from '../controllers/dashboard.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', validate(dashboardQuerySchema, 'query'), getPremiumDashboard);

export default router;
