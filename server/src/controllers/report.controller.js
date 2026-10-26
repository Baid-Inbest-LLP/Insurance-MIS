import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reportService from "../services/report.service.js";
import { buildAgentClientWiseWorkbook, buildBrandedWorkbook, sendWorkbook } from "../utils/excel.js";
import { buildAgentClientWisePdf, buildBrandedPdf, sendPdf } from "../utils/pdf.js";
import { canViewCommission } from "../services/transaction.service.js";
import { fileURLToPath } from "url";
import { getFinancialYear } from "../utils/financialYear.js";

const reportAsset = (name) => fileURLToPath(new URL(`../../assets/${name}`, import.meta.url));

const reportBranding = {
	companyName: "Insurance MIS",
	centerLogo: { filename: reportAsset("shree_red.png"), extension: "png", width: 58, height: 58 },
	rightLogo: { filename: reportAsset("Inbest_Logo(Blue).png"), extension: "png", width: 78, height: 58 },
};

const reportMeta = (filters) => {
	const dateRange = [filters.from, filters.to]
		.filter(Boolean)
		.map((date) => date.toISOString().slice(0, 10))
		.join(" to ");
	return [dateRange ? `Policy Date: ${dateRange}` : `Date: ${new Date().toISOString().slice(0, 10)}`];
};

const agentReportPeriod = (filters) => {
	const date = filters.from || filters.to || new Date();
	const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" }).toUpperCase();
	const year = String(date.getUTCFullYear()).slice(-2);
	return `${month}'${year} (F.Y.- ${getFinancialYear(date)})`;
};

const premiumColumns = (groupHeader, groupKey, includeCommission) => [
	{ header: groupHeader, key: groupKey, width: 28 },
	{ header: "Policies", key: "policies", width: 12, type: "number" },
	{ header: "Net Premium", key: "netPremium", width: 18, type: "currency" },
	{ header: "GST", key: "gst", width: 16, type: "currency" },
	{ header: "Premium", key: "premium", width: 18, type: "currency" },
	...(includeCommission ? [{ header: "Commission", key: "commission", width: 18, type: "currency" }] : []),
];

const exportGroupedReport = ({ getReport, sheetName, title, filename, groupKey, columns }) =>
	asyncHandler(async (req, res) => {
		const report = await getReport({ actor: req.user, filters: req.validated.query });
		const workbook = buildBrandedWorkbook({
			sheetName,
			title,
			branding: reportBranding,
			meta: reportMeta(req.validated.query),
			columns: columns(req.user),
			rows: report.rows.map((row) => ({ ...row, [groupKey]: row[groupKey].name ?? "-" })),
			totals: { ...report.totals, [groupKey]: "Total" },
		});
		await sendWorkbook(res, workbook, filename);
	});

// Summary reports use the same Puppeteer branding as the detailed Agent PDF,
// while retaining their own concise columns and totals.
const exportGroupedPdfReport = ({ getReport, title, filename, groupKey, columns }) =>
	asyncHandler(async (req, res) => {
		const report = await getReport({ actor: req.user, filters: req.validated.query });
		const pdf = await buildBrandedPdf({
			title,
			subtitle: agentReportPeriod(req.validated.query),
			meta: reportMeta(req.validated.query),
			columns: columns(req.user),
			rows: report.rows.map((row) => ({ ...row, [groupKey]: row[groupKey].name ?? "-" })),
			totals: { ...report.totals, [groupKey]: "Total" },
			companyInfo: { code: "INSURANCE MIS" },
			branding: reportBranding,
		});

		sendPdf(res, pdf, filename);
	});

const reportHandler = (getReport) =>
	asyncHandler(async (req, res) => {
		const report = await getReport({ actor: req.user, filters: req.validated.query });

		ApiResponse.success(res, report);
	});

// Policies, premium and commission per line of business for one department.
export const getLobWiseReport = reportHandler(reportService.getLobWiseReport);

// Downloads the same LOB report visible in the UI as a branded Excel workbook.
export const exportLobWiseReport = asyncHandler(async (req, res) => {
	const report = await reportService.getLobWiseReport({
		actor: req.user,
		filters: req.validated.query,
	});
	const includeCommission = canViewCommission(req.user);
	const workbook = buildBrandedWorkbook({
		sheetName: "LOB Wise",
		title: "LOB Wise Report",
		branding: reportBranding,
		meta: reportMeta(req.validated.query),
		columns: premiumColumns("LOB", "lob", includeCommission),
		rows: report.rows.map((row) => ({ ...row, lob: row.lob.name ?? "-" })),
		totals: { ...report.totals, lob: "Total" },
	});

	await sendWorkbook(res, workbook, "lob-wise-report.xlsx");
});
export const exportLobWisePdfReport = exportGroupedPdfReport({
	getReport: reportService.getLobWiseReport,
	title: "LOB WISE REPORT",
	filename: "lob-wise-report.pdf",
	groupKey: "lob",
	columns: (actor) => premiumColumns("LOB", "lob", canViewCommission(actor)),
});

// The same figures per branch (office) for one department.
export const getOfficeWiseReport = reportHandler(reportService.getOfficeWiseReport);
export const exportOfficeWiseReport = exportGroupedReport({
	getReport: reportService.getOfficeWiseReport,
	sheetName: "Office Wise",
	title: "Office Wise Report",
	filename: "office-wise-report.xlsx",
	groupKey: "branch",
	columns: (actor) => premiumColumns("Branch", "branch", canViewCommission(actor)),
});
export const exportOfficeWisePdfReport = exportGroupedPdfReport({
	getReport: reportService.getOfficeWiseReport,
	title: "OFFICE WISE REPORT",
	filename: "office-wise-report.pdf",
	groupKey: "branch",
	columns: (actor) => premiumColumns("Branch", "branch", canViewCommission(actor)),
});

// The same figures per agent for one department; entries without an agent form one group.
export const getAgentWiseReport = reportHandler(reportService.getAgentWiseReport);

// Downloads the detailed source-to-client report in the layout used by the
// operations Agent / Branch / Client report.
export const exportAgentWiseReport = asyncHandler(async (req, res) => {
	const report = await reportService.getAgentClientWiseReport({
		actor: req.user,
		filters: req.validated.query,
	});
	const workbook = buildAgentClientWiseWorkbook({
		sheetName: "Agent Client Wise",
		title: "AGENT - BRANCH - CLIENT WISE SOURCE REPORT",
		branding: reportBranding,
		meta: reportMeta(req.validated.query),
		rows: report.rows,
		totals: report.totals,
	});

	await sendWorkbook(res, workbook, "agent-client-wise-source-report.xlsx");
});

// The Agent tab alone also offers the portrait client-wise source report in the
// operational PDF layout supplied by the business team.
export const exportAgentWisePdfReport = asyncHandler(async (req, res) => {
	const report = await reportService.getAgentClientWiseReport({
		actor: req.user,
		filters: req.validated.query,
	});
	const pdf = await buildAgentClientWisePdf({
		title: `${report.departmentCode || "GI"} - BR - CLIENT WISE AGENTS SOURCE REPORT`,
		period: agentReportPeriod(req.validated.query),
		branding: reportBranding,
		companyInfo: report.companyInfo,
		rows: report.rows,
		totals: report.totals,
	});

	sendPdf(res, pdf, "agent-client-wise-source-report.pdf");
});

// The same figures per insurer for one department.
export const getInsurerWiseReport = reportHandler(reportService.getInsurerWiseReport);
export const exportInsurerWiseReport = exportGroupedReport({
	getReport: reportService.getInsurerWiseReport,
	sheetName: "Insurer Wise",
	title: "Insurer Wise Report",
	filename: "insurer-wise-report.xlsx",
	groupKey: "insurer",
	columns: (actor) => premiumColumns("Insurer", "insurer", canViewCommission(actor)),
});
export const exportInsurerWisePdfReport = exportGroupedPdfReport({
	getReport: reportService.getInsurerWiseReport,
	title: "INSURER WISE REPORT",
	filename: "insurer-wise-report.pdf",
	groupKey: "insurer",
	columns: (actor) => premiumColumns("Insurer", "insurer", canViewCommission(actor)),
});

// Commission per insurer for one department, split into received and pending.
export const getCommissionReport = reportHandler(reportService.getCommissionReport);
export const exportCommissionReport = exportGroupedReport({
	getReport: reportService.getCommissionReport,
	sheetName: "Commission",
	title: "Commission Report",
	filename: "commission-report.xlsx",
	groupKey: "insurer",
	columns: () => [
		{ header: "Insurer", key: "insurer", width: 28 },
		{ header: "Policies", key: "policies", width: 12, type: "number" },
		{ header: "Premium", key: "premium", width: 18, type: "currency" },
		{ header: "Commission", key: "commission", width: 18, type: "currency" },
		{ header: "Received", key: "received", width: 18, type: "currency" },
		{ header: "Pending", key: "pending", width: 18, type: "currency" },
	],
});
export const exportCommissionPdfReport = exportGroupedPdfReport({
	getReport: reportService.getCommissionReport,
	title: "COMMISSION REPORT",
	filename: "commission-report.pdf",
	groupKey: "insurer",
	columns: () => [
		{ header: "Insurer", key: "insurer", width: 28 },
		{ header: "Policies", key: "policies", width: 12, type: "number" },
		{ header: "Premium", key: "premium", width: 18, type: "currency" },
		{ header: "Commission", key: "commission", width: 18, type: "currency" },
		{ header: "Received", key: "received", width: 18, type: "currency" },
		{ header: "Pending", key: "pending", width: 18, type: "currency" },
	],
});
