import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '../../hooks/useAuth';
import { useTransactionOptions } from '../../hooks/useTransactions';
import { getFinancialYearRange } from '../../utils/financialYear';

const NO_FILTERS = { branch: '', lob: '', insurer: '', businessType: '', groupName: '', bqp: '', agent: '', source: '', productType: '' };

// Filters whose choices are master items of one department, so they start again when the type changes.
const DEPARTMENT_FILTERS = ['lob', 'insurer', 'businessType', 'groupName', 'bqp'];

// What the reports and the transaction list share: the type (department), a policy date range, the filters
// (branch, LOB, insurer, business type, source, agent) and the lookups that fill them.
// A report always has one type selected; with `allTypes` the user may leave it on "all types", and then the
// department-specific filters have no choices.
// `onChange` runs after any filter changes, e.g. to go back to the first page.
export default function useReportScope({ allTypes = false, onChange } = {}) {
  const { data: user } = useMe();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultDateRange = useMemo(() => getFinancialYearRange(), []);
  // The URL is the source of truth so dashboard drill-down links and the
  // browser Back/Forward buttons cannot leave stale filters on screen.
  const department = searchParams.get('department') ?? '';
  const from = searchParams.get('from') ?? defaultDateRange.from;
  const to = searchParams.get('to') ?? defaultDateRange.to;
  const filters = useMemo(
    () => Object.fromEntries(Object.keys(NO_FILTERS).map((key) => [key, searchParams.get(key) ?? ''])),
    [searchParams],
  );

  const changeParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
    onChange?.();
  };

  // The lookups are asked for once: with the user's only department when there is one (its master items come
  // along), then again for another department only when the user has more than one.
  const onlyDepartment = user?.departments?.length === 1 ? user.departments[0]._id : undefined;
  // It waits for the user, so a page reload does not first ask without the department.
  const {
    data: base,
    isLoading: isBaseLoading,
    isError: isLookupError,
    error: lookupError,
    refetch: refetchLookups,
  } = useTransactionOptions(onlyDepartment, Boolean(user));

  const departments = base?.departments ?? [];
  const selected =
    departments.find((item) => item._id === department) ?? (allTypes && departments.length > 1 ? undefined : departments[0]);
  const {
    data: lookups,
    isPlaceholderData,
    isError: isDepartmentLookupError,
    error: departmentLookupError,
    refetch: refetchDepartmentLookups,
  } = useTransactionOptions(selected?._id, Boolean(selected));

  return {
    user,
    allTypes,
    ready: Boolean(base),
    loading: isBaseLoading,
    isError: isLookupError || (Boolean(selected) && isDepartmentLookupError),
    error: lookupError ?? departmentLookupError,
    refetch: () => Promise.all([
      refetchLookups(),
      selected ? refetchDepartmentLookups() : Promise.resolve(),
    ]),
    departments,
    selected,
    // The previous department's lookups are not shown while the new ones load; with no type chosen there are none.
    options: selected ? (isPlaceholderData ? undefined : lookups) : base,
    from,
    to,
    filters,
    changeType: (value) =>
      changeParams({
        department: value,
        ...Object.fromEntries(DEPARTMENT_FILTERS.map((key) => [key, ''])),
      }),
    changeFilter: (key, value) => changeParams({ [key]: value }),
    changeFrom: (value) => changeParams({ from: value ?? '' }),
    changeTo: (value) => changeParams({ to: value ?? '' }),
    // The query sent to the server: the type, the date range and the filters that are set.
    params: {
      ...(selected && { department: selected._id }),
      ...(from && { from }),
      ...(to && { to }),
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    },
  };
}
