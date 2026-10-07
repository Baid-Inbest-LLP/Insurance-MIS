import { Router } from "express";
import * as transactions from "../controllers/transaction.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
	listTransactionsQuerySchema,
	transactionBodySchema,
	transactionParamsSchema,
} from "../validators/transaction.validator.js";

const router = Router();

router.use(authenticate);

router.get(
	"/",
	validate(listTransactionsQuerySchema, "query"),
	transactions.listTransactions,
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
