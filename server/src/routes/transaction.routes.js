import { Router } from "express";
import * as transactions from "../controllers/transaction.controller.js";
import * as drafts from "../controllers/transactionDraft.controller.js";
import { authenticate } from "../middleware/auth.js";
import { uploadPdfInMemory } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
	extractPolicyBodySchema,
	listTransactionsQuerySchema,
	transactionBodySchema,
	transactionParamsSchema,
} from "../validators/transaction.validator.js";
import { draftBodySchema, draftParamsSchema } from "../validators/draft.validator.js";

const router = Router();

router.use(authenticate);

router.get(
	"/",
	validate(listTransactionsQuerySchema, "query"),
	transactions.listTransactions,
);
router.post(
	"/extract-policy",
	uploadPdfInMemory("policy"),
	validate(extractPolicyBodySchema),
	transactions.extractPolicy,
);

// Drafts come before "/:id" so "drafts" is not read as a transaction id.
router.get("/drafts", drafts.listDrafts);
router.post("/drafts", validate(draftBodySchema), drafts.createDraft);
router.put(
	"/drafts/:id",
	validate(draftParamsSchema, "params"),
	validate(draftBodySchema),
	drafts.updateDraft,
);
router.delete(
	"/drafts/:id",
	validate(draftParamsSchema, "params"),
	drafts.deleteDraft,
);

router.get(
	"/:id",
	validate(transactionParamsSchema, "params"),
	transactions.getTransaction,
);
router.post(
	"/",
	validate(transactionBodySchema),
	transactions.createTransaction,
);
router.put(
	"/:id",
	validate(transactionParamsSchema, "params"),
	validate(transactionBodySchema),
	transactions.updateTransaction,
);
router.delete(
	"/:id",
	validate(transactionParamsSchema, "params"),
	transactions.deleteTransaction,
);

export default router;
