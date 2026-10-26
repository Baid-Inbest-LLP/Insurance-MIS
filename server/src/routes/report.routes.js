import { Router } from "express";
import * as reports from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reportQuerySchema } from "../validators/report.validator.js";

const router = Router();

router.use(authenticate);

router.get("/lob-wise/export", validate(reportQuerySchema, "query"), reports.exportLobWiseReport);
router.get("/lob-wise/export/pdf", validate(reportQuerySchema, "query"), reports.exportLobWisePdfReport);
router.get("/office-wise/export", validate(reportQuerySchema, "query"), reports.exportOfficeWiseReport);
router.get("/office-wise/export/pdf", validate(reportQuerySchema, "query"), reports.exportOfficeWisePdfReport);
router.get("/agent-wise/export", validate(reportQuerySchema, "query"), reports.exportAgentWiseReport);
router.get("/agent-wise/export/pdf", validate(reportQuerySchema, "query"), reports.exportAgentWisePdfReport);
router.get("/insurer-wise/export", validate(reportQuerySchema, "query"), reports.exportInsurerWiseReport);
router.get("/insurer-wise/export/pdf", validate(reportQuerySchema, "query"), reports.exportInsurerWisePdfReport);
router.get("/commission/export", validate(reportQuerySchema, "query"), reports.exportCommissionReport);
router.get("/commission/export/pdf", validate(reportQuerySchema, "query"), reports.exportCommissionPdfReport);
router.get("/lob-wise", validate(reportQuerySchema, "query"), reports.getLobWiseReport);
router.get("/office-wise", validate(reportQuerySchema, "query"), reports.getOfficeWiseReport);
router.get("/insurer-wise", validate(reportQuerySchema, "query"), reports.getInsurerWiseReport);
router.get("/agent-wise", validate(reportQuerySchema, "query"), reports.getAgentWiseReport);
router.get("/commission", validate(reportQuerySchema, "query"), reports.getCommissionReport);

export default router;
