import ExcelJS from "exceljs";

// Reusable visual system matching the supplied report screenshot.
export const INBEST_REPORT_THEME = {
  fontName: "Calibri",
  title: { size: 16, bold: true, color: { argb: "FF002E86" } },
  subtitle: { size: 10, color: { argb: "FF5B6B86" } },
  meta: { size: 10, color: { argb: "FF5B6B86" } },
  header: { size: 11, bold: true, color: { argb: "FFFFFFFF" } },
  total: { size: 11, bold: true, color: { argb: "FFFFFFFF" } },
  headerFill: "FF006598",
  totalFill: "FF006598",
  gridColor: "FFD9E2F0",
};

const DEFAULT_BRANDING = { companyName: "Insurance MIS" };
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SNO_COLUMN = { header: "S.No.", key: "__sno", width: 7, align: "center" };
const EMU_PER_PIXEL = 9525;

const resolveTheme = (overrides = {}) => ({
  ...INBEST_REPORT_THEME,
  ...overrides,
  title: { ...INBEST_REPORT_THEME.title, ...overrides.title },
  subtitle: { ...INBEST_REPORT_THEME.subtitle, ...overrides.subtitle },
  meta: { ...INBEST_REPORT_THEME.meta, ...overrides.meta },
  header: { ...INBEST_REPORT_THEME.header, ...overrides.header },
  total: { ...INBEST_REPORT_THEME.total, ...overrides.total },
});

const applyColumnFormat = (cell, column) => {
  switch (column.type) {
    case "currency":
      cell.numFmt = "[$₹-en-IN]#,##0.00";
      cell.alignment = { horizontal: "right", vertical: "middle" };
      break;
    case "number":
      cell.numFmt = "#,##0";
      cell.alignment = { horizontal: "right", vertical: "middle" };
      break;
    case "percent":
      cell.numFmt = '0.00"%"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
      break;
    case "date":
      cell.numFmt = "dd-mmm-yyyy";
      cell.alignment = { horizontal: "center", vertical: "middle" };
      break;
    default:
      cell.alignment = {
        horizontal: column.align || "left",
        vertical: "middle",
        wrapText: true,
      };
  }
};

const addLogo = ({
  workbook,
  worksheet,
  logo,
  columnCount,
  centerColumnWidth,
  rightColumnWidth,
  side,
}) => {
  if (!logo) return;
  const source = logo.buffer
    ? { buffer: logo.buffer, extension: logo.extension || "png" }
    : logo.base64
      ? { base64: logo.base64, extension: logo.extension || "png" }
      : logo.filename
        ? { filename: logo.filename, extension: logo.extension || "png" }
        : null;
  if (!source) return;

  const width = logo.width || 62;
  // Excel column widths are character units. In Calibri 11, convert them to
  // display pixels before creating the native drawing offset.
  const toColumnPixels = (columnWidth) =>
    Math.floor((columnWidth || 12) * 7 + 5);
  const centerColumnPixels = toColumnPixels(centerColumnWidth);
  const lastColumnPixels = toColumnPixels(rightColumnWidth);
  // For an even number of report columns, use the first column to the right of
  // centre. This puts the Sri logo in G for an A:L report and in D for A:G.
  const centerColumn = Math.floor(columnCount / 2);
  const logoColumn =
    side === "center" ? centerColumn : side === "right" ? columnCount - 1 : 0;
  const cellPixels =
    side === "center"
      ? centerColumnPixels
      : side === "right"
        ? lastColumnPixels
        : 84;
  const offsetPixels = Math.max((cellPixels - width) / 2, 0);
  const imageId = workbook.addImage(source);
  worksheet.addImage(imageId, {
    // Native offsets are EMUs. Fractional `col` anchors are scaled incorrectly
    // by ExcelJS for custom-width columns, leaving logos against the cell edge.
    tl: {
      nativeCol: logoColumn,
      nativeColOff: Math.round(offsetPixels * EMU_PER_PIXEL),
      nativeRow: 0,
      nativeRowOff: 0,
    },
    ext: { width, height: logo.height || 62 },
  });
};

const addCentredLine = ({ worksheet, row, columnCount, value, font }) => {
  worksheet.mergeCells(row, 1, row, columnCount);
  const cell = worksheet.getCell(row, 1);
  cell.value = value;
  cell.font = font;
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
};

// Branding is optional. Each logo can be supplied as a PNG/JPEG buffer, base64 value
// or local filename, making the same builder suitable for every report.
const addReportHeader = ({
  workbook,
  worksheet,
  title,
  subtitle,
  meta,
  branding,
  theme,
  headerColumnCount,
  centerColumnWidth,
  rightColumnWidth,
}) => {
  const columnCount = headerColumnCount;
  const brand = { ...DEFAULT_BRANDING, ...branding };
  let row = 3;

  // A 58px logo needs more than Excel's two default row heights. Reserve a
  // dedicated header band so it ends before the title row begins.
  worksheet.getRow(1).height = 22;
  worksheet.getRow(2).height = 22;

  if (!brand.centerLogo && !brand.leftLogo && !brand.logo && !brand.rightLogo) {
    addCentredLine({
      worksheet,
      row: 1,
      columnCount,
      value: brand.companyName,
      font: { name: theme.fontName, ...theme.subtitle },
    });
  }
  addLogo({
    workbook,
    worksheet,
    logo: brand.centerLogo || brand.leftLogo || brand.logo,
    columnCount,
    centerColumnWidth,
    side: "center",
  });
  addLogo({
    workbook,
    worksheet,
    logo: brand.rightLogo,
    columnCount,
    rightColumnWidth,
    side: "right",
  });

  worksheet.getRow(row).height = 28;
  addCentredLine({
    worksheet,
    row,
    columnCount,
    value: title,
    font: { name: theme.fontName, ...theme.title },
  });
  row += 1;

  if (subtitle) {
    addCentredLine({
      worksheet,
      row,
      columnCount,
      value: subtitle,
      font: { name: theme.fontName, ...theme.meta },
    });
    row += 1;
  }

  for (const line of meta) {
    worksheet.getRow(row).height = 18;
    addCentredLine({
      worksheet,
      row,
      columnCount,
      value: line,
      font: { name: theme.fontName, ...theme.meta },
    });
    row += 1;
  }

  return row + 1;
};

/**
 * Creates an Office-template-styled workbook for any tabular report.
 *
 * @param {object} config
 * @param {string} config.sheetName
 * @param {string} config.title
 * @param {string} [config.subtitle]
 * @param {string[]} [config.meta]
 * @param {Array} config.columns - { header, key, width, type, align }
 * @param {Array} config.rows
 * @param {object} [config.totals]
 * @param {object} [config.branding] - { companyName, centerLogo?, rightLogo? }
 * Logos accept { buffer|base64|filename, extension, width?, height? }.
 * @param {object} [config.theme] - overrides for INBEST_REPORT_THEME
 */
export const buildBrandedWorkbook = ({
  sheetName,
  title,
  subtitle,
  meta = [],
  columns: reportColumns,
  rows,
  totals,
  branding,
  theme: themeOverrides,
}) => {
  const theme = resolveTheme(themeOverrides);
  const columns = [SNO_COLUMN, ...reportColumns];
  // Keep the branding inside the table's final column, even for a narrow report.
  const headerColumnCount = columns.length;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Insurance MIS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width || 18,
  }));

  const headerRowNumber = addReportHeader({
    workbook,
    worksheet,
    title,
    subtitle,
    meta,
    branding,
    theme,
    headerColumnCount,
    centerColumnWidth: columns[Math.floor(columns.length / 2)].width,
    rightColumnWidth: columns[columns.length - 1].width,
  });

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 20;
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: theme.fontName, ...theme.header };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: theme.headerFill },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: theme.gridColor } },
    };
  });

  let rowNumber = headerRowNumber + 1;
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1);
      cell.value =
        column.key === "__sno" ? rowIndex + 1 : (row[column.key] ?? null);
      cell.font = { name: theme.fontName, size: 11 };
      applyColumnFormat(cell, column);
      cell.border = {
        top: { style: "thin", color: { argb: theme.gridColor } },
        left: { style: "thin", color: { argb: theme.gridColor } },
        bottom: { style: "thin", color: { argb: theme.gridColor } },
        right: { style: "thin", color: { argb: theme.gridColor } },
      };
    });
    rowNumber += 1;
  });

  if (totals) {
    const totalRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      cell.value =
        column.key === "__sno"
          ? null
          : index === 1
            ? "Total"
            : (totals[column.key] ?? null);
      cell.font = { name: theme.fontName, ...theme.total };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: theme.totalFill },
      };
      applyColumnFormat(cell, column);
    });
  }

  worksheet.views = [{ showGridLines: false }];
  return workbook;
};

const reportBorder = (color = INBEST_REPORT_THEME.gridColor) => ({
  top: { style: "thin", color: { argb: color } },
  left: { style: "thin", color: { argb: color } },
  bottom: { style: "thin", color: { argb: color } },
  right: { style: "thin", color: { argb: color } },
});

const mergeWhenNeeded = (worksheet, fromRow, fromColumn, toRow, toColumn) => {
  if (fromRow !== toRow || fromColumn !== toColumn) {
    worksheet.mergeCells(fromRow, fromColumn, toRow, toColumn);
  }
};

/**
 * Builds the detailed Agent / Branch / Client source report.  Unlike the
 * summary reports, this preserves the hierarchy used by the finance report:
 * source, office, reference, agent, then each insured client.
 */
export const buildAgentClientWiseWorkbook = ({
  sheetName = "Agent Client Wise",
  title = "AGENT - BRANCH - CLIENT WISE SOURCE REPORT",
  meta = [],
  branding,
  rows = [],
  totals = {},
}) => {
  const theme = resolveTheme();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Insurance MIS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  const columns = [
    { header: "SOURCE", width: 16 },
    { header: "OFFICE", width: 18 },
    { header: "REFERENCE", width: 18 },
    { header: "AGENT'S NAME", width: 24 },
    { header: "NAME OF THE INSURED", width: 34 },
    { header: "NOP'S", width: 10 },
    { header: "TOTAL PREMIUM", width: 18 },
  ];
  worksheet.columns = columns.map((column) => ({ width: column.width }));
  worksheet.views = [{ showGridLines: false }];
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
  };
  worksheet.headerFooter = {
    oddFooter: "&LInsurance MIS&CPage &P of &N&RGenerated &D &T",
  };

  const headerRowNumber = addReportHeader({
    workbook,
    worksheet,
    title,
    meta,
    branding,
    theme,
    headerColumnCount: columns.length,
    centerColumnWidth: columns[Math.floor(columns.length / 2)].width,
    rightColumnWidth: columns[columns.length - 1].width,
  });
  worksheet.pageSetup.printTitlesRow = `1:${headerRowNumber}`;

  const tableHeader = worksheet.getRow(headerRowNumber);
  tableHeader.height = 27;
  columns.forEach((column, index) => {
    const cell = tableHeader.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: theme.fontName, size: 10, bold: true, color: theme.header.color };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.headerFill } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = reportBorder();
  });

  const tree = new Map();
  for (const row of rows) {
    const source = row.source || "-";
    const office = row.branch?.name || "-";
    const reference = row.reference || "-";
    const agent = row.agent?.name || "-";
    if (!tree.has(source)) tree.set(source, new Map());
    const offices = tree.get(source);
    if (!offices.has(office)) offices.set(office, new Map());
    const references = offices.get(office);
    if (!references.has(reference)) references.set(reference, new Map());
    const agents = references.get(reference);
    if (!agents.has(agent)) agents.set(agent, []);
    agents.get(agent).push(row);
  }

  const moneyFormat = "[$\u20B9-en-IN]#,##0.00";
  let rowNumber = headerRowNumber + 1;
  const writeCells = (row, values, { fill, bold = false, fontSize = 9 } = {}) => {
    const excelRow = worksheet.getRow(row);
    excelRow.height = 17;
    values.forEach((value, index) => {
      const cell = excelRow.getCell(index + 1);
      cell.value = value;
      cell.font = { name: theme.fontName, size: fontSize, bold, color: { argb: "FF111111" } };
      if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.border = reportBorder();
      cell.alignment = {
        horizontal: index === 5 || index === 6 ? "right" : "left",
        vertical: "middle",
        wrapText: index < 5,
      };
    });
    excelRow.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    excelRow.getCell(7).numFmt = moneyFormat;
  };
  const verticalMerge = (column, firstRow, lastRow, value) => {
    mergeWhenNeeded(worksheet, firstRow, column, lastRow, column);
    const cell = worksheet.getCell(firstRow, column);
    cell.value = value;
    cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  };
  for (const [source, offices] of tree) {
    const sourceStart = rowNumber;
    const sourceRows = [];
    for (const [office, references] of offices) {
      const officeStart = rowNumber;
      const officeRows = [];
      for (const [reference, agents] of references) {
        const referenceStart = rowNumber;
        const referenceRows = [];
        for (const [agent, clients] of agents) {
          const agentStart = rowNumber;
          clients.forEach((client) => {
            writeCells(rowNumber, [null, null, null, null, client.clientName || "-", client.policies || 0, Number(client.premium || 0)]);
            rowNumber += 1;
          });
          const agentTotal = clients.reduce(
            (total, client) => ({ policies: total.policies + Number(client.policies || 0), premium: total.premium + Number(client.premium || 0) }),
            { policies: 0, premium: 0 },
          );
          writeCells(rowNumber, [null, null, null, "TOTAL", null, agentTotal.policies, agentTotal.premium], { fill: "FFEAF3F8", bold: true });
          verticalMerge(4, agentStart, rowNumber - 1, agent);
          referenceRows.push(...clients);
          officeRows.push(...clients);
          sourceRows.push(...clients);
          rowNumber += 1;
        }
        const referenceTotal = referenceRows.reduce(
          (total, client) => ({ policies: total.policies + Number(client.policies || 0), premium: total.premium + Number(client.premium || 0) }),
          { policies: 0, premium: 0 },
        );
        writeCells(rowNumber, [null, null, "REFERENCE TOTAL", null, null, referenceTotal.policies, referenceTotal.premium], { fill: "FFD6EAF4", bold: true });
        verticalMerge(3, referenceStart, rowNumber - 1, reference);
        rowNumber += 1;
      }
      const officeTotal = officeRows.reduce(
        (total, client) => ({ policies: total.policies + Number(client.policies || 0), premium: total.premium + Number(client.premium || 0) }),
        { policies: 0, premium: 0 },
      );
      writeCells(rowNumber, [null, "OFFICE TOTAL", null, null, null, officeTotal.policies, officeTotal.premium], { fill: "FFB9D7EA", bold: true });
      verticalMerge(2, officeStart, rowNumber - 1, office);
      rowNumber += 1;
    }
    const sourceTotal = sourceRows.reduce(
      (total, client) => ({ policies: total.policies + Number(client.policies || 0), premium: total.premium + Number(client.premium || 0) }),
      { policies: 0, premium: 0 },
    );
    verticalMerge(1, sourceStart, rowNumber - 1, source);
    writeCells(rowNumber, ["SOURCE TOTAL", null, null, null, null, sourceTotal.policies, sourceTotal.premium], { fill: "FF8CC0DE", bold: true });
    rowNumber += 1;
  }

  const grandTotal = worksheet.getRow(rowNumber);
  grandTotal.height = 20;
  mergeWhenNeeded(worksheet, rowNumber, 1, rowNumber, 5);
  const totalLabel = grandTotal.getCell(1);
  totalLabel.value = "GRAND TOTAL";
  [totalLabel, grandTotal.getCell(6), grandTotal.getCell(7)].forEach((cell) => {
    cell.font = { name: theme.fontName, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.totalFill } };
    cell.border = reportBorder();
    cell.alignment = { horizontal: cell === totalLabel ? "right" : "right", vertical: "middle" };
  });
  grandTotal.getCell(6).value = totals.policies || 0;
  grandTotal.getCell(7).value = Number(totals.premium || 0);
  grandTotal.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
  grandTotal.getCell(7).numFmt = moneyFormat;

  return workbook;
};

export const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader("Content-Type", XLSX_MIME);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};
