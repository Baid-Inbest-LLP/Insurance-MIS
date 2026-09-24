import ExcelJS from 'exceljs';

// Brand palette (ARGB) reused across every generated sheet.
const COLORS = {
  brand: 'FF0B2F81',
  headerFill: 'FF005887',
  headerText: 'FFFFFFFF',
  muted: 'FF6B7280',
  border: 'FFD1D5DB',
  black: 'FF000000',
  companyCode: 'FF13AFCD',
};

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

// Apply per-column number format + alignment to a data/total cell.
const applyColumnFormat = (cell, column) => {
  switch (column.type) {
    case 'currency':
      cell.numFmt = '"₹"#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      break;
    case 'number':
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      break;
    case 'percent':
      cell.numFmt = '0.00"%"';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      break;
    case 'date':
      cell.numFmt = 'dd-mmm-yyyy';
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      break;
    default:
      cell.alignment = { horizontal: column.align || 'left', vertical: 'middle', wrapText: true };
  }
};

// Draw the header band: title on its own full-width row (truly centred on the table, not just
// within a column band), then company code/GST (left) + subtitle (right) sharing a row below,
// then meta lines.
const addBrandedHeader = ({ worksheet, title, subtitle, meta, columns, companyInfo }) => {
  const columnCount = columns.length;

  // Row 1: two-line title ("Insurance MIS" / "FY 26-27"), merged across every column so it centres
  // on the table itself. The two lines use different sizes, so this needs rich text — a plain
  // `.value` string can only carry one font for the whole cell.
  worksheet.getRow(1).height = 34;
  worksheet.mergeCells(1, 1, 1, columnCount);
  const [titleLine1, titleLine2] = title.split('\n');
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = {
    richText: [
      { font: { size: 16, bold: true, color: { argb: COLORS.brand } }, text: titleLine1 },
      ...(titleLine2
        ? [
            { font: { size: 16, bold: true, color: { argb: COLORS.brand } }, text: '\n' },
            { font: { size: 11, bold: true, color: { argb: COLORS.brand } }, text: titleLine2 },
          ]
        : []),
    ],
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Row 2: company code (left) + subtitle (right). The company code's own column (S.No., only
  // 7 units wide) is far too narrow for an 18pt code like "BSIB" — and because its neighbour is
  // about to become part of the subtitle's merged range, there's no empty cell left for the
  // overflow to spill into, so the text gets clipped. Give it a merged range of its own, wide
  // enough to hold a few characters at that size.
  worksheet.getRow(2).height = 26;
  const companyCodeCols = Math.min(columnCount, 3);
  if (companyInfo) {
    if (companyCodeCols > 1) worksheet.mergeCells(2, 1, 2, companyCodeCols);
    const codeCell = worksheet.getCell(2, 1);
    codeCell.value = companyInfo.code || '-';
    codeCell.font = { size: 18, bold: true, color: { argb: COLORS.companyCode } };
    codeCell.alignment = { horizontal: 'left', vertical: 'middle' };
  }
  if (subtitle) {
    const subtitleStartCol = companyInfo ? companyCodeCols + 1 : 1;
    if (columnCount > subtitleStartCol) {
      worksheet.mergeCells(2, subtitleStartCol, 2, columnCount);
    }
    const subtitleCell = worksheet.getCell(2, subtitleStartCol);
    subtitleCell.value = subtitle;
    // Report name — a second title line, not a muted annotation, so it keeps the brand color.
    subtitleCell.font = { size: 13, bold: true, color: { argb: COLORS.brand } };
    subtitleCell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // Row 3: GST, left-aligned under the company code.
  let row = 3;
  if (companyInfo) {
    worksheet.getRow(3).height = 18;
    if (companyCodeCols > 1) worksheet.mergeCells(3, 1, 3, companyCodeCols);
    const gstCell = worksheet.getCell(3, 1);
    gstCell.value = `GST No.: ${companyInfo.taxId || '-'}`;
    gstCell.font = { size: 10, bold: true, color: { argb: COLORS.black } };
    gstCell.alignment = { horizontal: 'left', vertical: 'middle' };
    row += 1;
  }

  const addCentredLine = (value, font) => {
    worksheet.mergeCells(row, 1, row, columnCount);
    const cell = worksheet.getCell(row, 1);
    cell.value = value;
    cell.font = font;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    row += 1;
  };

  for (const line of meta) addCentredLine(line, { size: 9, color: { argb: COLORS.muted } });

  return row + 1; // leave one blank spacer row before the table
};

// Auto-prepended to every export so row numbering is consistent without each report
// having to declare it.
const SNO_COLUMN = { header: 'S.No.', key: '__sno', width: 7, align: 'center' };

/**
 * Global report builder — the single entry point every export uses.
 * Produces a fully branded, styled worksheet from a column/row config.
 * A leading S.No. column is added automatically.
 *
 * @param {object}   config
 * @param {string}   config.sheetName
 * @param {string}   config.title
 * @param {string}  [config.subtitle]
 * @param {string[]}[config.meta]      - context lines (FY, filters, generated date)
 * @param {Array}    config.columns    - { header, key, width, type, align }
 * @param {Array}    config.rows       - objects keyed by column.key
 * @param {object}  [config.totals]    - keyed by column.key; rendered as a bold total row
 * @param {object}  [config.companyInfo] - { code, taxId }; shown top-left when a single
 *   company is in scope for the report
 * @returns {ExcelJS.Workbook}
 */
export const buildBrandedWorkbook = ({
  sheetName,
  title,
  subtitle,
  meta = [],
  columns: reportColumns,
  rows,
  totals,
  companyInfo,
}) => {
  const columns = [SNO_COLUMN, ...reportColumns];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Insurance MIS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map((column) => ({ key: column.key, width: column.width || 18 }));

  const headerRowNumber = addBrandedHeader({
    worksheet,
    title,
    subtitle,
    companyInfo,
    meta,
    columns,
  });

  // Table header
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 20;
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Data rows
  let rowNumber = headerRowNumber + 1;
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1);
      cell.value = column.key === '__sno' ? rowIndex + 1 : (row[column.key] ?? null);
      applyColumnFormat(cell, column);
      cell.border = THIN_BORDER;
    });
    rowNumber += 1;
  });

  // Total row — "Total" lands under the first real column (index 1, since 0 is S.No.).
  if (totals) {
    const totalRow = worksheet.getRow(rowNumber);
    columns.forEach((column, index) => {
      const cell = totalRow.getCell(index + 1);
      if (column.key === '__sno') cell.value = null;
      else cell.value = index === 1 ? 'Total' : (totals[column.key] ?? null);
      applyColumnFormat(cell, column);
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
      cell.border = THIN_BORDER;
    });
  }

  worksheet.views = [{ showGridLines: false }];
  return workbook;
};

// Stream a workbook back to the client as an .xlsx download.
export const sendWorkbook = async (res, workbook, filename) => {
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};
