import { useCallback } from 'react';
import Skeleton from './Skeleton';

const alignClass = (align) =>
  align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

const defaultRowKey = (row, index) => row?._id ?? row?.id ?? index;

// Native checkboxes have no `indeterminate` attribute — it has to be set imperatively on the DOM node.
function SelectionCheckbox({ checked, indeterminate = false, onChange, ariaLabel }) {
  const setRef = useCallback((el) => {
    if (el) el.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={setRef}
      type="checkbox"
      className="rounded cursor-pointer"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
}

// Fixed-layout table with loading/empty states, pagination, and optional row-selection checkboxes.
export default function DataTable({
  columns,
  data = [],
  rowKey = defaultRowKey,
  loading = false,
  skeletonRows = 3,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  pagination,
  selection,
  header,
  className = '',
  autoLayout = false,
  serialNumber = false,
  serialNumberLabel = 'S.No.',
}) {
  const getId = selection?.getId ?? rowKey;
  const pageIds = selection ? data.map((row, i) => getId(row, i)) : [];
  const allSelected =
    Boolean(selection) && pageIds.length > 0 && pageIds.every((id) => selection.selectedIds.has(id));
  const someSelected =
    Boolean(selection) && !allSelected && pageIds.some((id) => selection.selectedIds.has(id));

  const toggleAll = () => {
    const next = new Set(selection.selectedIds);
    pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    selection.onChange(next);
  };

  const toggleRow = (id) => {
    const next = new Set(selection.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };

  const columnCount = columns.length + (selection ? 1 : 0) + (serialNumber ? 1 : 0);
  // Continues numbering across pages when pagination info is available, rather than
  // restarting at 1 on every page.
  const serialOffset =
    serialNumber && pagination?.page && pagination?.limit ? (pagination.page - 1) * pagination.limit : 0;

  return (
    <div className={`card overflow-hidden ${className}`.trim()}>
      {header && <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">{header}</div>}
      {loading ? (
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: skeletonRows }).map((_, row) => (
              <div
                key={row}
                className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
              >
                {Array.from({ length: columnCount }).map((_, i) => (
                  <Skeleton key={i} className={`h-4 ${i === columnCount - 1 ? 'w-16' : 'flex-1'}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          <p className="company-empty-title">{emptyTitle}</p>
          {emptyDescription && <p className="company-empty-desc">{emptyDescription}</p>}
          {emptyAction && (
            <button type="button" onClick={emptyAction.onClick} className="btn-primary mt-4">
              {emptyAction.label}
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table
            className="!text-base"
            style={autoLayout ? { tableLayout: 'auto' } : undefined}
          >
            <thead>
              <tr>
                {selection && (
                  <th className="w-10 text-center">
                    <SelectionCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleAll}
                      ariaLabel="Select all rows on this page"
                    />
                  </th>
                )}
                {serialNumber && <th className="w-12 text-center">{serialNumberLabel}</th>}
                {columns.map((col, i) => (
                  <th
                    key={col.key ?? i}
                    style={col.width ? { width: col.width } : undefined}
                    className={`${alignClass(col.headerAlign ?? col.align)} ${col.headerClassName ?? ''}`.trim()}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => {
                const id = selection ? getId(row, rowIndex) : undefined;
                const isSelected = Boolean(selection) && selection.selectedIds.has(id);
                return (
                  <tr key={rowKey(row, rowIndex)}>
                    {selection && (
                      <td className="text-center">
                        <SelectionCheckbox
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          ariaLabel={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {serialNumber && (
                      <td className="text-center">{serialOffset + rowIndex + 1}</td>
                    )}
                    {columns.map((col, i) => (
                      <td
                        key={col.key ?? i}
                        className={`${alignClass(col.align)} ${col.className ?? ''}`.trim()}
                      >
                        {col.render ? col.render(row, rowIndex) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="company-form-section-hint">
            Page {pagination.page} of {pagination.pages}
            {pagination.total != null ? ` · ${pagination.total} total` : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-xs py-1.5 px-3 text-primary-800 border-primary-400 hover:bg-primary-50 hover:border-primary-600"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary text-xs py-1.5 px-3 text-primary-800 border-primary-400 hover:bg-primary-50 hover:border-primary-600"
              disabled={pagination.page >= pagination.pages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
