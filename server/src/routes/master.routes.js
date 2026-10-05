import { Router } from 'express';
import * as master from '../controllers/master.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as masterValues from '../controllers/master-value.controller.js';
import * as departments from '../controllers/department.controller.js';
import {
  createDepartmentSchema,
  departmentParamsSchema,
  departmentsQuerySchema,
  updateDepartmentSchema,
} from '../validators/department.validator.js';
import { updateUserSchema, userParamsSchema } from '../validators/user.validator.js';
import {
  createMasterItemSchema,
  masterItemParamsSchema,
  masterItemsQuerySchema,
  masterSlugParamsSchema,
  updateMasterItemSchema,
} from '../validators/master-value.validator.js';

const router = Router();

router.use(authenticate);

router.get('/lookups', master.getLookupData);

router.get('/locations', master.locationController.list);
router.post('/locations', authorize('superadmin'), master.locationController.create);
router.put('/locations/:id', authorize('superadmin'), master.locationController.update);
router.delete('/locations/:id', authorize('superadmin'), master.locationController.remove);

router.get('/location-cities', master.getLocationCities);

router.get(
  '/departments',
  authorize('superadmin', 'admin'),
  validate(departmentsQuerySchema, 'query'),
  departments.listDepartments,
);
router.post(
  '/departments',
  authorize('superadmin'),
  validate(createDepartmentSchema),
  departments.createDepartment,
);
router.put(
  '/departments/:id',
  authorize('superadmin'),
  validate(departmentParamsSchema, 'params'),
  validate(updateDepartmentSchema),
  departments.updateDepartment,
);

router.get(
  '/catalog/:departmentId/:slug',
  validate(masterSlugParamsSchema, 'params'),
  validate(masterItemsQuerySchema, 'query'),
  masterValues.listMasterItems,
);
router.post(
  '/catalog/:departmentId/:slug',
  authorize('superadmin'),
  validate(masterSlugParamsSchema, 'params'),
  validate(createMasterItemSchema),
  masterValues.createMasterItem,
);
router.put(
  '/catalog/:departmentId/:slug/:itemId',
  authorize('superadmin'),
  validate(masterItemParamsSchema, 'params'),
  validate(updateMasterItemSchema),
  masterValues.updateMasterItem,
);
router.delete(
  '/catalog/:departmentId/:slug/:itemId',
  authorize('superadmin'),
  validate(masterItemParamsSchema, 'params'),
  masterValues.deleteMasterItem,
);

router.get('/users', authorize('superadmin'), master.listUsers);
router.put(
  '/users/:id',
  authorize('superadmin'),
  validate(userParamsSchema, 'params'),
  validate(updateUserSchema),
  master.updateUser,
);
router.delete('/users/:id', authorize('superadmin'), master.deleteUser);
router.post('/users/:id/reset-password', authorize('superadmin'), master.resetPassword);

export default router;
