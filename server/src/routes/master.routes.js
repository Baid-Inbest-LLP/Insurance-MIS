import { Router } from 'express';
import * as master from '../controllers/master.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as masterValues from '../controllers/master-value.controller.js';
import * as departments from '../controllers/department.controller.js';
import * as agents from '../controllers/agent.controller.js';
import { getLookups } from '../controllers/lookup.controller.js';
import {
  createDepartmentSchema,
  departmentParamsSchema,
  departmentsQuerySchema,
  updateDepartmentSchema,
} from '../validators/department.validator.js';
import {
  agentParamsSchema,
  agentsQuerySchema,
  createAgentSchema,
  updateAgentSchema,
} from '../validators/agent.validator.js';
import { lookupsQuerySchema } from '../validators/lookup.validator.js';
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

router.get('/branches', master.branchController.list);
router.post('/branches', authorize('superadmin'), master.branchController.create);
router.put('/branches/:id', authorize('superadmin'), master.branchController.update);
router.delete('/branches/:id', authorize('superadmin'), master.branchController.remove);

router.get('/location-cities', master.getLocationCities);

// Departments, branches and a department's master items for entry forms, in one call.
router.get('/lookups', validate(lookupsQuerySchema, 'query'), getLookups);

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

router.get('/agents', validate(agentsQuerySchema, 'query'), agents.listAgents);
router.post('/agents', authorize('superadmin'), validate(createAgentSchema), agents.createAgent);
router.put(
  '/agents/:id',
  authorize('superadmin'),
  validate(agentParamsSchema, 'params'),
  validate(updateAgentSchema),
  agents.updateAgent,
);
router.delete(
  '/agents/:id',
  authorize('superadmin'),
  validate(agentParamsSchema, 'params'),
  agents.deleteAgent,
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
