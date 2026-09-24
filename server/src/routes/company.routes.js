import { Router } from 'express';
import * as companyController from '../controllers/company.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', companyController.getCompanies);
router.post('/', authorize('superadmin'), companyController.createCompany);
router.put('/:id', authorize('superadmin'), companyController.updateCompany);
router.delete('/:id', authorize('superadmin'), companyController.deleteCompany);

export default router;
