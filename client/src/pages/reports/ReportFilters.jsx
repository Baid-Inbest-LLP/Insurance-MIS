import { DateInput } from '@mantine/dates';
import { dateInputProps } from '../../components/common/form/DateField';

const byName = (items) => (items ?? []).map((item) => ({ value: item._id, label: item.name }));

// The filters besides the type and the dates. `master` ones list one department's master items, so they need a
// type to be chosen; product type belongs to life insurance only.
const FILTERS = [
  { key: 'branch', all: 'All branches', items: (options) => (options?.branches ?? []).map((item) => ({ value: item._id, label: item.code })) },
  { key: 'lob', all: 'All LOBs', master: true, items: (options) => byName(options?.masters?.lob) },
  { key: 'insurer', all: 'All insurers', master: true, items: (options) => byName(options?.masters?.insurer) },
  { key: 'businessType', all: 'All business types', master: true, items: (options) => byName(options?.masters?.businessType) },
  { key: 'productType', all: 'All product types', master: true, lifeOnly: true, items: (options) => byName(options?.masters?.productType) },
  { key: 'agent', all: 'All agents', items: (options) => byName(options?.agents) },
];

// Everything a list can be filtered by: the type (only when the user has more than one), the filters above
// and the policy date range. The filter a report is grouped by (`groupKey`) is left out: its rows already list it.
export default function ReportFilters({ scope, groupKey }) {
  const { departments, selected, allTypes, from, to, options, filters } = scope;
  const offered = FILTERS.filter(
    (filter) =>
      filter.key !== groupKey &&
      (!filter.master || selected) &&
      (!filter.lifeOnly || selected?.code === 'LI'),
  );

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
