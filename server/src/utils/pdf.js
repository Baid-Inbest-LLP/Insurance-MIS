import fs from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';

// Brand palette (hex) — mirrors the ARGB palette in utils/excel.js.
const COLORS = {
  brand: '#0B2F81',
  headerFill: '#005887',
  headerText: '#FFFFFF',
  muted: '#6B7280',
  border: '#D1D5DB',
  black: '#000000',
  companyCode: '#13AFCD',
};

const PDF_MIME = 'application/pdf';

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

// Renders the title's two lines ("Insurance MIS" / "FY 26-27") with the second line smaller —
// mirrors the rich-text split in utils/excel.js's title cell.
const renderTitle = (title) => {
  const [line1, line2] = title.split('\n');
  return line2
    ? `${escapeHtml(line1)}<br /><span class="fy">${escapeHtml(line2)}</span>`
    : escapeHtml(title);
};

// Mirrors excel.js's applyColumnFormat, producing a display string instead of a cell format.
const formatCellValue = (value, column) => {
  if (value === null || value === undefined || value === '') return '';
  switch (column.type) {
    case 'currency':
      return `₹${Number(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case 'number':
      return Number(value).toLocaleString('en-IN');
    case 'percent':
      return `${Number(value).toFixed(2)}%`;
    case 'date':
      return new Date(value)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        .replace(/ /g, '-');
    default:
      return escapeHtml(value);
  }
};

const cellAlign = (column) => {
  if (column.type === 'currency' || column.type === 'number' || column.type === 'percent') {
    return 'right';
  }
  if (column.type === 'date') return 'center';
  return column.align || 'left';
};

const renderTableHead = (columns) =>
  `<thead><tr>${columns
    .map((column) => `<th style="text-align:center">${escapeHtml(column.header)}</th>`)
    .join('')}</tr></thead>`;

const renderTableBody = (columns, rows) =>
  `<tbody>${rows
    .map(
      (row, rowIndex) =>
        `<tr>${columns
          .map((column) => {
            const value = column.key === '__sno' ? rowIndex + 1 : row[column.key];
            return `<td style="text-align:${cellAlign(column)}">${formatCellValue(value, column)}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('')}</tbody>`;

// "Total" lands under the first real column (index 1, since 0 is the S.No. column).
const renderTotalsRow = (columns, totals) =>
  `<tfoot><tr>${columns
    .map((column, index) => {
      const value =
        column.key === '__sno'
          ? ''
          : index === 1
            ? 'Total'
            : formatCellValue(totals[column.key], column);
      return `<td style="text-align:${cellAlign(column)}">${escapeHtml(value)}</td>`;
    })
    .join('')}</tr></tfoot>`;

// Auto-prepended to every export so row numbering is consistent without each report
// having to declare it — mirrors excel.js's SNO_COLUMN.
const SNO_COLUMN = { header: 'S.No.', key: '__sno', align: 'center' };

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
}) => {
  const columns = [SNO_COLUMN, ...reportColumns];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 24px; }
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    margin-bottom: 12px;
  }
  .header .company-info { justify-self: start; line-height: 1.3; }
  .header .company-info .code { font-size: 18px; font-weight: 700; color: ${COLORS.companyCode}; }
  .header .company-info .gst { font-size: 10px; font-weight: 700; color: ${COLORS.black}; }
  .header .title { justify-self: center; color: ${COLORS.brand}; font-size: 18px; font-weight: 700; text-align: center; line-height: 1.3; }
  .header .title .fy { font-size: 12px; }
  /* Report name — a second title line, not a muted annotation, so it keeps the brand color. */
  .header .subtitle { justify-self: end; color: ${COLORS.brand}; font-size: 14px; font-weight: 700; text-align: right; }
  .meta { text-align: center; color: ${COLORS.muted}; font-size: 10.5px; margin: 1px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 10.5px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: ${COLORS.headerFill};
    color: ${COLORS.headerText};
    font-weight: 700;
    padding: 7px 8px;
    border: 1px solid ${COLORS.border};
  }
  td {
    padding: 6px 8px;
    border: 1px solid ${COLORS.border};
  }
  tbody tr:nth-child(even) { background: #F9FAFB; }
  tfoot td { background: ${COLORS.headerFill}; color: ${COLORS.headerText}; font-weight: 700; }
</style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${
        companyInfo
          ? `<div class="code">${escapeHtml(companyInfo.code || '-')}</div>
             <div class="gst">GST No.: ${escapeHtml(companyInfo.taxId || '-')}</div>`
          : ''
      }
    </div>
    <div class="title">${renderTitle(title)}</div>
    <div class="subtitle">${subtitle ? escapeHtml(subtitle) : ''}</div>
  </div>
  ${meta.map((line) => `<div class="meta">${escapeHtml(line)}</div>`).join('')}
  <table>
    ${renderTableHead(columns)}
    ${totals ? renderTotalsRow(columns, totals) : ''}
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
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
    throw new Error('Packaged Chromium executable path could not be resolved');
  }

  return puppeteerCore.launch({
    args: [...chromium.args, '--disable-dev-shm-usage'],
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
          'Chrome/Chromium not found locally. Set PUPPETEER_EXECUTABLE_PATH in server/.env',
        );
      }
      const browser = await puppeteerCore.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      // A crashed/killed browser must not stay cached — the next request should relaunch.
      browser.once('disconnected', () => {
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

const renderPdfBuffer = async (html) => {
  const browser = usePackagedChromium ? await launchPackagedBrowser() : await getLocalBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '12mm', bottom: '16mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      // Header/footer templates render in an isolated context (no access to the page's own
      // <style>), so everything needed has to be inlined here.
      headerTemplate: '<span></span>',
      footerTemplate: `
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
 * @param {object}  [config.companyInfo] - { code, taxId }; shown top-left when a single
 *   company is in scope for the report
 * @returns {Promise<Buffer>}
 */
export const buildBrandedPdf = ({ title, subtitle, meta, columns, rows, totals, companyInfo }) =>
  renderPdfBuffer(buildBrandedHtml({ title, subtitle, meta, columns, rows, totals, companyInfo }));

// Send a rendered PDF buffer back to the client as a download.
export const sendPdf = (res, buffer, filename) => {
  res.setHeader('Content-Type', PDF_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(buffer);
};
