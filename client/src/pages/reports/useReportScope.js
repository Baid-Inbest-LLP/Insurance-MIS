import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '../../hooks/useAuth';
import { useTransactionOptions } from '../../hooks/useTransactions';

const NO_FILTERS = { branch: '', lob: '', insurer: '', businessType: '', agent: '', source: '', productType: '' };

// Filters whose choices are master items of one department, so they start again when the type changes.
const DEPARTMENT_FILTERS = ['lob', 'insurer', 'businessType'];

// What the reports and the transaction list share: the type (department), a policy date range, the filters
// (branch, LOB, insurer, business type, agent) and the lookups that fill them.
// A report always has one type selected; with `allTypes` a user who has several may leave it on "all types", and
// then the filters that list one department's master items are not offered.
// `onChange` runs after any filter changes, e.g. to go back to the first page.
export default function useReportScope({ allTypes = false, onChange } = {}) {
  const { data: user } = useMe();
  const [searchParams] = useSearchParams();
  // Dashboard chart clicks pass their filters in the URL.  Initialise the
  // shared report scope from it so the Transactions page is a real drill-down.
  const [department, setDepartment] = useState(() => searchParams.get('department') ?? '');
  const [from, setFrom] = useState(() => searchParams.get('from') ?? '');
  const [to, setTo] = useState(() => searchParams.get('to') ?? '');
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(Object.keys(NO_FILTERS).map((key) => [key, searchParams.get(key) ?? ''])),
  );

  // The lookups are asked for once: with the user's only department when there is one (its master items come
  // along), then again for another department only when the user has more than one.
  const onlyDepartment = user?.departments?.length === 1 ? user.departments[0]._id : undefined;
  // It waits for the user, so a page reload does not first ask without the department.
  const { data: base } = useTransactionOptions(onlyDepartment, Boolean(user));

  const departments = base?.departments ?? [];
  const selected =
    departments.find((item) => item._id === department) ?? (allTypes && departments.length > 1 ? undefined : departments[0]);
  const { data: lookups, isPlaceholderData } = useTransactionOptions(selected?._id, Boolean(selected));

  const changed = (change) => (...args) => {
    change(...args);
    onChange?.();
  };

  return {
    user,
    allTypes,
    ready: Boolean(base),
    departments,
    selected,
    // The previous department's lookups are not shown while the new ones load; with no type chosen there are none.
    options: selected ? (isPlaceholderData ? undefined : lookups) : base,
    from,
    to,
    filters,
    changeType: changed((value) => {
      setDepartment(value);
      setFilters((current) => ({ ...current, ...Object.fromEntries(DEPARTMENT_FILTERS.map((key) => [key, ''])) }));
    }),
    changeFilter: changed((key, value) => setFilters((current) => ({ ...current, [key]: value }))),
    changeFrom: changed((value) => setFrom(value ?? '')),
    changeTo: changed((value) => setTo(value ?? '')),
    // The query sent to the server: the type, the date range and the filters that are set.
    params: {
      ...(selected && { department: selected._id }),
      ...(from && { from }),
      ...(to && { to }),
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    },
  };
}
