import { DateInput } from '@mantine/dates';
import { dateInputProps } from '../../components/common/form/DateField';
import { SOURCES } from '../../constants/transactions';

const byName = (items) => (items ?? []).map((item) => ({ value: item._id, label: item.name }));

const SOURCE_ITEMS = SOURCES.map((source) => ({ value: source, label: source }));

// The filters besides the type and the dates. LOB, insurer and business type list one department's items, so they
// have no choices until a type is chosen.
const FILTERS = [
  { key: 'branch', all: 'All branches', items: (options) => (options?.branches ?? []).map((item) => ({ value: item._id, label: item.code })) },
  { key: 'lob', all: 'All LOBs', items: (options) => byName(options?.masters?.lob) },
  { key: 'insurer', all: 'All insurers', items: (options) => byName(options?.masters?.insurer) },
  { key: 'businessType', all: 'All business types', items: (options) => byName(options?.masters?.businessType) },
  { key: 'source', all: 'All sources', items: () => SOURCE_ITEMS },
  { key: 'agent', all: 'All agents', items: (options) => byName(options?.agents) },
];

// The type (only when the user has more than one), the filters above and the policy date range. A report leaves
// out the filter it is grouped by (`groupKey`).
export default function ReportFilters({ scope, groupKey }) {
  const { departments, selected, allTypes, from, to, options, filters } = scope;
  const offered = FILTERS.filter((filter) => filter.key !== groupKey);

  return (
    <div className="card p-4 mb-4 flex flex-wrap items-center gap-2">
      {departments.length > 1 && (
        <select
          className="input-field w-full sm:w-32"
          value={selected?._id ?? ''}
          onChange={(e) => scope.changeType(e.target.value)}
          aria-label="Type"
        >
          {allTypes && <option value="">All types</option>}
          {departments.map((item) => (
            <option key={item._id} value={item._id}>
              {item.code}
            </option>
          ))}
        </select>
      )}
      {offered.map((filter) => (
        <select
          key={filter.key}
          className="input-field w-full sm:w-44"
          value={filters[filter.key]}
          onChange={(e) => scope.changeFilter(filter.key, e.target.value)}
          aria-label={filter.all}
        >
          <option value="">{filter.all}</option>
          {filter.items(options).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ))}
      <DateInput {...dateInputProps} className="w-full sm:w-40" placeholder="From date" value={from || null} maxDate={to || undefined} onChange={scope.changeFrom} aria-label="From date" />
      <DateInput {...dateInputProps} className="w-full sm:w-40" placeholder="To date" value={to || null} minDate={from || undefined} onChange={scope.changeTo} aria-label="To date" />
    </div>
  );
}
