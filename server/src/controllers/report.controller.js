import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reportService from "../services/report.service.js";

const reportHandler = (getReport) =>
	asyncHandler(async (req, res) => {
		const report = await getReport({ actor: req.user, filters: req.validated.query });

		ApiResponse.success(res, report);
	});

// Policies, premium and commission per line of business for one department.
export const getLobWiseReport = reportHandler(reportService.getLobWiseReport);

// The same figures per branch (office) for one department.
export const getOfficeWiseReport = reportHandler(reportService.getOfficeWiseReport);

// The same figures per agent for one department; entries without an agent form one group.
export const getAgentWiseReport = reportHandler(reportService.getAgentWiseReport);

// The same figures per insurer for one department.
export const getInsurerWiseReport = reportHandler(reportService.getInsurerWiseReport);

// Commission per insurer for one department, split into received and pending.
export const getCommissionReport = reportHandler(reportService.getCommissionReport);
