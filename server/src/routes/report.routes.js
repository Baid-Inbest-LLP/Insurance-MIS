import { Router } from "express";
import * as reports from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reportQuerySchema } from "../validators/report.validator.js";

const router = Router();

router.use(authenticate);

router.get("/lob-wise", validate(reportQuerySchema, "query"), reports.getLobWiseReport);
router.get("/office-wise", validate(reportQuerySchema, "query"), reports.getOfficeWiseReport);
router.get("/insurer-wise", validate(reportQuerySchema, "query"), reports.getInsurerWiseReport);
router.get("/agent-wise", validate(reportQuerySchema, "query"), reports.getAgentWiseReport);
router.get("/commission", validate(reportQuerySchema, "query"), reports.getCommissionReport);

export default router;
