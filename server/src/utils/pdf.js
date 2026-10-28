import fs from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

// Brand palette (hex) — mirrors the ARGB palette in utils/excel.js.
const COLORS = {
  brand: "#0B2F81",
  headerFill: "#005887",
  headerText: "#FFFFFF",
  muted: "#6B7280",
  border: "#D1D5DB",
  black: "#000000",
  companyCode: "#13AFCD",
};

const PDF_MIME = "application/pdf";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

// Renders the title's two lines ("Insurance MIS" / "FY 26-27") with the second line smaller —
// mirrors the rich-text split in utils/excel.js's title cell.
const renderTitle = (title) => {
  const [line1, line2] = title.split("\n");
  return line2
    ? `${escapeHtml(line1)}<br /><span class="fy">${escapeHtml(line2)}</span>`
    : escapeHtml(title);
};

// Mirrors excel.js's applyColumnFormat, producing a display string instead of a cell format.
const formatCellValue = (value, column) => {
  if (value === null || value === undefined || value === "") return "";
  switch (column.type) {
    case "currency":
      return `₹${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "number":
      return Number(value).toLocaleString("en-IN");
    case "percent":
      return `${Number(value).toFixed(2)}%`;
    case "date":
      return new Date(value)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .replace(/ /g, "-");
    default:
      return escapeHtml(value);
  }
};

const cellAlign = (column) => {
  if (
    column.type === "currency" ||
    column.type === "number" ||
    column.type === "percent"
  ) {
    return "right";
  }
  if (column.type === "date") return "center";
  return column.align || "left";
};

const renderTableHead = ({ columns, title, subtitle, meta, companyInfo, centerLogo, rightLogo }) =>
  `<thead>
    <tr><th class="masthead" colspan="${columns.length}"><div class="masthead-inner">
      <div class="company">${
        companyInfo
          ? `<div class="company-code">${escapeHtml(companyInfo.code || "-")}</div>
             ${companyInfo.name ? `<div class="company-name">${escapeHtml(companyInfo.name)}</div>` : ""}
             ${companyInfo.cinOrLlp ? `<div class="company-detail">CIN :- ${escapeHtml(companyInfo.cinOrLlp)}</div>` : ""}
             ${companyInfo.registrationNumber ? `<div class="company-detail">REG No :- ${escapeHtml(companyInfo.registrationNumber)}</div>` : ""}
             ${companyInfo.gst ? `<div class="company-detail">GST No :- ${escapeHtml(companyInfo.gst)}</div>` : ""}`
          : ""
      }</div>
      <div class="title-block">${centerLogo ? `<img class="logo-center" src="${centerLogo}" alt="" />` : ""}<div class="title">${renderTitle(title)}</div>${subtitle ? `<div class="period">${escapeHtml(subtitle)}</div>` : ""}${meta.map((line) => `<div class="meta">${escapeHtml(line)}</div>`).join("")}</div>
      <div class="right-logo">${rightLogo ? `<img class="logo-right" src="${rightLogo}" alt="" />` : ""}</div>
    </div></th></tr>
    <tr>${columns.map((column) => `<th class="column-heading" style="text-align:center">${escapeHtml(column.header)}</th>`).join("")}</tr>
  </thead>`;

const renderColGroup = (columns) => {
  const total = columns.reduce((sum, column) => sum + Number(column.width || 12), 0);
  return `<colgroup>${columns
    .map((column) => `<col style="width:${((Number(column.width || 12) / total) * 100).toFixed(2)}%">`)
    .join("")}</colgroup>`;
};

const renderTableBody = (columns, rows) =>
  `<tbody>${
    rows.length
      ? rows
          .map(
            (row, rowIndex) =>
              `<tr>${columns
                .map((column) => {
                  const value = column.key === "__sno" ? rowIndex + 1 : row[column.key];
                  return `<td style="text-align:${cellAlign(column)}">${formatCellValue(value, column)}</td>`;
                })
                .join("")}</tr>`,
          )
          .join("")
      : `<tr class="empty-row"><td colspan="${columns.length}">No policy records found for the selected filters.</td></tr>`
  }</tbody>`;

// "Total" lands under the first real column (index 1, since 0 is the S.No. column).
const renderTotalsRow = (columns, totals) =>
  `<tfoot><tr>${columns
    .map((column, index) => {
      const value =
        column.key === "__sno"
          ? ""
          : index === 1
            ? "Total"
            : formatCellValue(totals[column.key], column);
      return `<td style="text-align:${cellAlign(column)}">${escapeHtml(value)}</td>`;
    })
    .join("")}</tr></tfoot>`;

// Auto-prepended to every export so row numbering is consistent without each report
// having to declare it — mirrors excel.js's SNO_COLUMN.
const SNO_COLUMN = { header: "S.No.", key: "__sno", align: "center", width: 8 };

/**
 * Global report builder — the HTML counterpart to buildBrandedWorkbook. Same
 * column/row/totals shape, rendered as a print-ready HTML page for Puppeteer.
 * A leading S.No. column is added automatically.
 */
const buildBrandedHtml = ({
  title,
  subtitle,
  meta = [],
  columns: reportColumns,
  rows,
  totals,
  companyInfo,
  branding = {},
}) => {
  const columns = [SNO_COLUMN, ...reportColumns];
  const centerLogo = toDataUri(branding.centerLogo?.filename);
  const rightLogo = toDataUri(branding.rightLogo?.filename);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 7px; }
  .masthead { border: 0; background: #fff; padding: 0 0 4px; }
  .masthead-inner {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    align-items: start;
    min-height: 165px;
    padding-top: 15px;
  }
  .company { text-align: left; padding-top: 1px; }
  .company-code { color: #00b0f0; font-weight: 700; font-size: 32px; line-height: 1; }
  .company-name { font-size: 8px; font-weight: 700; margin-top: 4px; }
  .company-detail { font-size: 8px; font-weight: 700; line-height: 1.4; }
  .title-block { text-align: center; }
  .logo-center { display: block; margin: 0 auto 5px; max-width: 150px; max-height: 90px; }
  .title { color: ${COLORS.black}; font-size: 12px; font-weight: 700; text-decoration: underline; line-height: 1.15; margin-top: 4px; }
  .title .fy { font-size: 10px; }
  /* Report name — a second title line, not a muted annotation, so it keeps the brand color. */
  .period { color: ${COLORS.black}; font-size: 10px; font-weight: 700; margin-top: 3px; }
  .meta { color: ${COLORS.muted}; font-size: 7px; font-weight: 400; margin-top: 2px; }
  .right-logo { text-align: right; }
  .logo-right { max-width: 165px; max-height: 110px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th.column-heading {
    background: ${COLORS.headerFill};
    color: ${COLORS.headerText};
    font-weight: 700;
    padding: 11.5px 3px;
    border: 0.5px solid #0d0d0d;
    font-size: 6.7px;
  }
  td {
    padding: 3.5px 2.6px;
    line-height: 1.18;
    border: 0.5px solid #0d0d0d;
  }
  tbody tr:nth-child(even) { background: #F9FAFB; }
  tfoot td { background: ${COLORS.headerFill}; color: ${COLORS.headerText}; font-weight: 700; }
  .empty-row td { background: #fff4d6; color: #6b4f00; text-align: center; font-style: italic; padding: 10px; }
</style>
</head>
<body>
  <table>
    ${renderColGroup(columns)}
    ${renderTableHead({ columns, title, subtitle, meta, companyInfo, centerLogo, rightLogo })}
    ${totals ? renderTotalsRow(columns, totals) : ""}
    ${renderTableBody(columns, rows)}
  </table>
</body>
</html>`;
};

// On Render/Vercel we run the serverless-friendly @sparticuz/chromium build via puppeteer-core;
// locally we point puppeteer-core at an installed Chrome/Chromium. This mirrors the working
// PO-Software / Mer-App setup so PDF export behaves identically once deployed.
const usePackagedChromium = Boolean(process.env.VERCEL || process.env.RENDER);

// Resolve an installed Chrome/Chromium executable for local development.
const getLocalChromePath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH)
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return undefined;
};

const launchPackagedBrowser = async () => {
  // Disable WebGL/swiftshader extraction — saves memory on Render.
  chromium.setGraphicsMode = false;

  const executablePath = await chromium.executablePath();
  if (!executablePath) {
    throw new Error("Packaged Chromium executable path could not be resolved");
  }

  return puppeteerCore.launch({
    args: [...chromium.args, "--disable-dev-shm-usage"],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
};

// A single local Chromium instance is launched lazily and reused across requests — spinning up
// a fresh browser per export would add multi-second latency to every download. On Render we
// instead launch a fresh browser per request (avoids a stale/OOM singleton).
let browserPromise = null;
const getLocalBrowser = () => {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = getLocalChromePath();
      if (!executablePath) {
        throw new Error(
          "Chrome/Chromium not found locally. Set PUPPETEER_EXECUTABLE_PATH in server/.env",
        );
      }
      const browser = await puppeteerCore.launch({
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
      // A crashed/killed browser must not stay cached — the next request should relaunch.
      browser.once("disconnected", () => {
        browserPromise = null;
      });
      return browser;
    })();
    // A failed launch must not permanently wedge every future export — let the next call retry.
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
};

const renderPdfBuffer = async (
  html,
  {
    landscape = true,
    footerTemplate,
    margin = { top: "12mm", bottom: "16mm", left: "10mm", right: "10mm" },
  } = {},
) => {
  const browser = usePackagedChromium
    ? await launchPackagedBrowser()
    : await getLocalBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      margin,
      displayHeaderFooter: true,
      // Header/footer templates render in an isolated context (no access to the page's own
      // <style>), so everything needed has to be inlined here.
      headerTemplate: "<span></span>",
      footerTemplate: footerTemplate || `
        <div style="width:100%; font-size:8px; text-align:center; color:${COLORS.muted}; font-family:'Segoe UI', Arial, sans-serif;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    });
  } finally {
    await page.close().catch(() => {});
    // On Render each request owns its browser — close it so we don't leak processes/memory.
    if (usePackagedChromium) await browser.close().catch(() => {});
  }
};

/**
 * Same config shape as buildBrandedWorkbook — renders it as a branded PDF buffer instead.
 *
 * @param {object}   config
 * @param {string}   config.title
 * @param {string}  [config.subtitle]
 * @param {string[]}[config.meta]
 * @param {Array}    config.columns
 * @param {Array}    config.rows
 * @param {object}  [config.totals]
 * @param {object}  [config.companyInfo] - { code, cinOrLlp, registrationNumber, gst }; shown top-left when a single
 *   company is in scope for the report
 * @returns {Promise<Buffer>}
 */
export const buildBrandedPdf = ({
  title,
  subtitle,
  meta,
  columns,
  rows,
  totals,
  companyInfo,
  branding,
}) => {
  const companyCode = companyInfo?.code || companyInfo?.name || "INSURANCE MIS";
  return renderPdfBuffer(
    buildBrandedHtml({
      title,
      subtitle,
      meta,
      columns,
      rows,
      totals,
      companyInfo,
      branding,
    }),
    {
      landscape: false,
      margin: { top: "5mm", bottom: "14mm", left: "13mm", right: "3mm" },
      footerTemplate: `<div style="width:100%; padding:0 28px; font-family:Arial, sans-serif; font-size:5px; color:#111; display:flex; justify-content:space-between;"><span>${escapeHtml(companyCode)} - ${escapeHtml(title)} (${escapeHtml(subtitle || "")})</span><span>Date - <span class="date"></span> &nbsp; PAGE <span class="pageNumber"></span> &nbsp; Time - <span class="time"></span></span></div>`,
    },
  );
};

const toDataUri = (filename) => {
  if (!filename || !fs.existsSync(filename)) return "";
  const extension = filename.split(".").pop()?.toLowerCase() || "png";
  return `data:image/${extension};base64,${fs.readFileSync(filename).toString("base64")}`;
};

const formatRupees = (value) =>
  `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const sumClientRows = (rows) =>
  rows.reduce(
    (total, row) => ({
      policies: total.policies + Number(row.policies || 0),
      premium: total.premium + Number(row.premium || 0),
    }),
    { policies: 0, premium: 0 },
  );

// Creates the hierarchy from the detailed Agent report without making the PDF
// renderer aware of MongoDB ids or report-service details.
const buildAgentTree = (rows) => {
  const sources = new Map();
  for (const row of rows) {
    const source = row.source || "-";
    const office = row.branch?.name || "-";
    const reference = row.reference || "-";
    const agent = row.agent?.name || "-";
    if (!sources.has(source)) sources.set(source, new Map());
    const offices = sources.get(source);
    if (!offices.has(office)) offices.set(office, new Map());
    const references = offices.get(office);
    if (!references.has(reference)) references.set(reference, new Map());
    const agents = references.get(reference);
    if (!agents.has(agent)) agents.set(agent, []);
    agents.get(agent).push(row);
  }
  return sources;
};

const agentTableRows = (rows) => {
  if (!rows.length) {
    return '<tr class="empty-row"><td colspan="7">No policy records match the selected department, date range and filters.</td></tr>';
  }
  const tree = buildAgentTree(rows);
  const output = [];
  // A bounded fragment keeps every rowspan inside one printable table section.
  // Chromium cannot split a rowspan that crosses a page break reliably: it leaves
  // the merged cell behind and creates a large blank continuation area.
  const maxFragmentRows = 18;

  for (const [source, offices] of tree) {
    const sourceClients = [...offices.values()].flatMap((references) =>
      [...references.values()].flatMap((agents) => [...agents.values()].flat()),
    );

    // Turn the hierarchy into small entries. An entry contains one or more
    // client rows for an agent plus any totals that genuinely end at that row.
    // Long client lists are split before pagination, so a single office or
    // reference can no longer force a rowspan over a page boundary.
    const entries = [];
    for (const [office, references] of offices) {
      const officeStart = entries.length;
      for (const [reference, agents] of references) {
        const referenceClients = [...agents.values()].flat();
        for (const [agent, clients] of agents) {
          const agentTotal = sumClientRows(clients);
          // The final part may also contain agent, reference and office totals.
          // Reserve three rows so even that part remains print-safe.
          const clientChunkSize = Math.max(1, maxFragmentRows - 3);
          for (let start = 0; start < clients.length; start += clientChunkSize) {
            const chunk = clients.slice(start, start + clientChunkSize);
            const isAgentEnd = start + clientChunkSize >= clients.length;
            entries.push({
              office,
              reference,
              agent,
              clients: chunk,
              agentEnd: isAgentEnd,
              agentTotal,
              referenceEnd: false,
              officeEnd: false,
              referenceTotal: null,
              officeTotal: null,
            });
          }
        }
        const lastReferenceEntry = entries[entries.length - 1];
        lastReferenceEntry.referenceEnd = true;
        lastReferenceEntry.referenceTotal = sumClientRows(referenceClients);
      }
      const officeClients = entries
        .slice(officeStart)
        .flatMap((entry) => entry.clients);
      const lastOfficeEntry = entries[entries.length - 1];
      lastOfficeEntry.officeEnd = true;
      lastOfficeEntry.officeTotal = sumClientRows(officeClients);
    }

    // Pack entries into fragments. Each fragment starts a new, local hierarchy;
    // all of its rowspans therefore end before the next fragment begins.
    const sourceFragments = [];
    let fragment = [];
    let fragmentRows = 0;
    for (const entry of entries) {
      const entryRows =
        entry.clients.length +
        Number(entry.agentEnd) +
        Number(entry.referenceEnd) +
        Number(entry.officeEnd);
      if (fragment.length && fragmentRows + entryRows > maxFragmentRows) {
        sourceFragments.push(fragment);
        fragment = [];
        fragmentRows = 0;
      }
      fragment.push(entry);
      fragmentRows += entryRows;
    }
    if (fragment.length) sourceFragments.push(fragment);

    for (const fragment of sourceFragments) {
      const sourceFragmentSpan = fragment.reduce(
        (count, entry) =>
          count +
          entry.clients.length +
          Number(entry.agentEnd) +
          Number(entry.referenceEnd) +
          Number(entry.officeEnd),
        0,
      );
      const fragmentRows = [];
      let sourceFirst = true;
      let entryIndex = 0;
      while (entryIndex < fragment.length) {
        const office = fragment[entryIndex].office;
        const officeEntries = [];
        while (entryIndex < fragment.length && fragment[entryIndex].office === office)
          officeEntries.push(fragment[entryIndex++]);
        const officeSpan = officeEntries.reduce(
          (count, entry) => count + entry.clients.length + Number(entry.agentEnd) + Number(entry.referenceEnd),
          0,
        );
        let officeFirst = true;
        let officeIndex = 0;
        while (officeIndex < officeEntries.length) {
          const reference = officeEntries[officeIndex].reference;
          const referenceEntries = [];
          while (officeIndex < officeEntries.length && officeEntries[officeIndex].reference === reference)
            referenceEntries.push(officeEntries[officeIndex++]);
          const referenceSpan = referenceEntries.reduce(
            (count, entry) => count + entry.clients.length + Number(entry.agentEnd),
            0,
          );
          let referenceFirst = true;
          let referenceIndex = 0;
          while (referenceIndex < referenceEntries.length) {
            const agent = referenceEntries[referenceIndex].agent;
            const agentEntries = [];
            while (referenceIndex < referenceEntries.length && referenceEntries[referenceIndex].agent === agent)
              agentEntries.push(referenceEntries[referenceIndex++]);
            const agentSpan = agentEntries.reduce(
              (count, entry) => count + entry.clients.length,
              0,
            );
            let agentFirst = true;
            for (const entry of agentEntries) {
              entry.clients.forEach((client) => {
                fragmentRows.push(`<tr>
                  ${sourceFirst ? `<td class="group source-cell" rowspan="${sourceFragmentSpan}">${escapeHtml(source)}</td>` : ""}
                  ${officeFirst ? `<td class="group office-cell" rowspan="${officeSpan}">${escapeHtml(office)}</td>` : ""}
                  ${referenceFirst ? `<td class="group reference-cell" rowspan="${referenceSpan}">${escapeHtml(reference)}</td>` : ""}
                  ${agentFirst ? `<td class="group agent-cell" rowspan="${agentSpan}">${escapeHtml(agent)}</td>` : ""}
                  <td>${escapeHtml(client.clientName || "-")}</td>
                  <td class="number">${Number(client.policies || 0).toLocaleString("en-IN")}</td>
                  <td class="number">${formatRupees(client.premium)}</td>
                </tr>`);
                sourceFirst = false;
                officeFirst = false;
                referenceFirst = false;
                agentFirst = false;
              });
              if (entry.agentEnd) {
                fragmentRows.push(`<tr class="total agent-total"><td colspan="2">TOTAL</td><td class="number">${entry.agentTotal.policies.toLocaleString("en-IN")}</td><td class="number">${formatRupees(entry.agentTotal.premium)}</td></tr>`);
              }
            }
          }
          const finalReferenceEntry = referenceEntries[referenceEntries.length - 1];
          if (finalReferenceEntry.referenceEnd) {
            const total = finalReferenceEntry.referenceTotal;
            fragmentRows.push(`<tr class="total reference-total"><td colspan="3">${escapeHtml(reference)} TOTAL</td><td class="number">${total.policies.toLocaleString("en-IN")}</td><td class="number">${formatRupees(total.premium)}</td></tr>`);
          }
        }
        const finalOfficeEntry = officeEntries[officeEntries.length - 1];
        if (finalOfficeEntry.officeEnd) {
          const total = finalOfficeEntry.officeTotal;
          fragmentRows.push(`<tr class="total office-total"><td colspan="4">${escapeHtml(office)} TOTAL</td><td class="number">${total.policies.toLocaleString("en-IN")}</td><td class="number">${formatRupees(total.premium)}</td></tr>`);
        }
      }
      output.push(`<tbody class="source-fragment">${fragmentRows.join("")}</tbody>`);
    }
    const sourceTotal = sumClientRows(sourceClients);
    // The supplied operational layout ends the Direct block at its office
    // total; an explicit source total is used for Agents and any other source.
    if (String(source).toUpperCase() !== "DIRECT") {
      output.push(`<tbody><tr class="total source-total"><td colspan="5">${escapeHtml(source)} - TOTAL</td><td class="number">${sourceTotal.policies.toLocaleString("en-IN")}</td><td class="number">${formatRupees(sourceTotal.premium)}</td></tr></tbody>`);
    }
  }
  return output.join("");
};

/**
 * Builds the compact finance PDF supplied for the Agent source report. It is
 * intentionally separate from the Excel visual system: its table hierarchy,
 * colour bands, small typography and repeated masthead reproduce the document
 * format used by operations.
 */
export const buildAgentClientWisePdf = ({
  title,
  period,
  rows = [],
  totals = {},
  branding = {},
  companyInfo,
}) => {
  const centerLogo = toDataUri(branding.centerLogo?.filename);
  const rightLogo = toDataUri(branding.rightLogo?.filename);
  const companyCode = companyInfo?.code || companyInfo?.name || "INSURANCE MIS";
  const companyName = companyInfo?.name || "";
  const cinOrLlp = companyInfo?.cinOrLlp || "";
  const registrationNumber = companyInfo?.registrationNumber || "";
  const gst = companyInfo?.gst || "";
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  * { box-sizing: border-box; }
  /* This is a dedicated print template, deliberately independent from the
     Excel report theme and browser application styles. */
  @page { size: A4 portrait; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 7px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 0.5px solid #0d0d0d; padding: 3.5px 2.6px; line-height: 1.18; vertical-align: middle; overflow-wrap: anywhere; }
  th.column-heading { color: #fff; background: #005887; text-align: center; font-size: 6.7px; font-weight: 700; padding: 11.5px 1.8px; }
  th.masthead { border: 0; background: #fff; padding: 0 0 4px; }
  .masthead-inner { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: start; min-height: 165px; padding-top: 15px; }
  .company { text-align: left; padding-top: 1px; }
  .company-code { color: #00b0f0; font-weight: 700; font-size: 32px; line-height: 1; }
  .company-name { font-size: 8px; font-weight: 700; margin-top: 4px; }
  .company-detail { font-size: 8px; font-weight: 700; line-height: 1.4; }
  .title-block { text-align: center; }
  .logo-center { display: block; margin: 0 auto 5px; max-width: 150px; max-height: 90px; }
  .title { font-size: 12px; font-weight: 700; text-decoration: underline; margin-top: 4px; }
  .period { font-size: 10px; font-weight: 700; margin-top: 3px; }
  .right-logo { text-align: right; }
  .logo-right { max-width: 165px; max-height: 110px; }
  td.group { text-align: center; font-weight: 700; }
  /* A source is rendered in office-sized spans so it never crosses a PDF page.
     Keep the joins between those spans peach; black joins looked like stray rules. */
  td.source-cell {
    background: #f8cbad;
    border-top-color: #f8cbad;
    border-bottom-color: #f8cbad;
    font-size: 14px;
  }
  td.office-cell { background: #fff; }
  td.reference-cell { background: #ffe699; }
  td.agent-cell { background: #f8cbad; font-size: 6.5px; }
  td.number { text-align: right; white-space: nowrap; }
  tbody.source-fragment { break-inside: auto; page-break-inside: auto; }
  .total { font-weight: 700; text-align: right; }
  .agent-total td { background: #ffe699; }
  .reference-total td { background: #ffe699; }
  .office-total td { background: #c6efce; color: #006100; }
  .source-total td, tfoot td { background: #005887; color: #fff; }
  .empty-row td { background: #fff4d6; color: #6b4f00; text-align: center; font-size: 7px; font-style: italic; padding: 10px; }
  tfoot { display: table-row-group; }
  .grand-total td { font-size: 7.8px; font-weight: 700; padding: 4.8px 2.8px; }
</style></head><body>
  <table>
    <colgroup><col style="width:13.33%"><col style="width:10.61%"><col style="width:12.30%"><col style="width:11.46%"><col style="width:25.15%"><col style="width:7.04%"><col style="width:20.11%"></colgroup>
    <thead>
      <tr><th class="masthead" colspan="7"><div class="masthead-inner">
        <div class="company"><div class="company-code">${escapeHtml(companyCode)}</div>${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ""}${cinOrLlp ? `<div class="company-detail">CIN :- ${escapeHtml(cinOrLlp)}</div>` : ""}${registrationNumber ? `<div class="company-detail">REG No :- ${escapeHtml(registrationNumber)}</div>` : ""}${gst ? `<div class="company-detail">GST No :- ${escapeHtml(gst)}</div>` : ""}</div>
        <div class="title-block">${centerLogo ? `<img class="logo-center" src="${centerLogo}" alt="" />` : ""}<div class="title">${escapeHtml(title)}</div><div class="period">${escapeHtml(period || "")}</div></div>
        <div class="right-logo">${rightLogo ? `<img class="logo-right" src="${rightLogo}" alt="" />` : ""}</div>
      </div></th></tr>
      <tr><th class="column-heading">SOURCE</th><th class="column-heading">OFFICE</th><th class="column-heading">REFERENCE</th><th class="column-heading">AGENT'S</th><th class="column-heading">NAME OF THE INSURED</th><th class="column-heading">NOP'S</th><th class="column-heading">TOTAL PREMIUM</th></tr>
    </thead>
    ${agentTableRows(rows)}
    <tfoot><tr class="grand-total"><td colspan="5" style="text-align:right">GRAND TOTAL</td><td class="number">${Number(totals.policies || 0).toLocaleString("en-IN")}</td><td class="number">${formatRupees(totals.premium)}</td></tr></tfoot>
  </table>
</body></html>`;

  return renderPdfBuffer(html, {
    landscape: false,
    margin: { top: "5mm", bottom: "14mm", left: "13mm", right: "3mm" },
    footerTemplate: `<div style="width:100%; padding:0 28px; font-family:Arial, sans-serif; font-size:5px; color:#111; display:flex; justify-content:space-between;"><span>${escapeHtml(companyCode)} - ${escapeHtml(title)} (${escapeHtml(period || "")})</span><span>Date - <span class="date"></span> &nbsp; PAGE <span class="pageNumber"></span> &nbsp; Time - <span class="time"></span></span></div>`,
  });
};

// Send a rendered PDF buffer back to the client as a download.
export const sendPdf = (res, buffer, filename) => {
  res.setHeader("Content-Type", PDF_MIME);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.end(buffer);
};
