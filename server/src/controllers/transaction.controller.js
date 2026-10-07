import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as transactionService from "../services/transaction.service.js";

// Lists transactions the user can see, newest policy date first.
export const listTransactions = asyncHandler(async (req, res) => {
	const { items, pagination } = await transactionService.listTransactions({
		actor: req.user,
		filters: req.validated.query,
	});

	ApiResponse.paginated(res, items, pagination);
});

// Returns one transaction with master item names filled in.
export const getTransaction = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	const transaction = await transactionService.getTransaction({
		id,
		actor: req.user,
	});

	ApiResponse.success(res, transaction);
});

// Adds a GI or LI transaction, depending on `kind`.
export const createTransaction = asyncHandler(async (req, res) => {
	await transactionService.createTransaction({
		actor: req.user,
		data: req.body,
	});

	ApiResponse.created(res, null, "Transaction created");
});

// Replaces the editable fields of a transaction.
export const updateTransaction = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	await transactionService.updateTransaction({
		id,
		actor: req.user,
		data: req.body,
	});

	ApiResponse.success(res, null, "Transaction updated");
});

// Soft-deletes a transaction.
export const deleteTransaction = asyncHandler(async (req, res) => {
	const { id } = req.validated.params;
	await transactionService.deleteTransaction({ id, actor: req.user });

	ApiResponse.success(res, null, "Transaction deleted");
});
