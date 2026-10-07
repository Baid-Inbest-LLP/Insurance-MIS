import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as lookupService from "../services/lookup.service.js";

// Returns the departments, branches, agents and master items an entry form needs.
export const getLookups = asyncHandler(async (req, res) => {
	const lookups = await lookupService.getLookups({
		actor: req.user,
		department: req.validated.query.department,
	});

	ApiResponse.success(res, lookups);
});
