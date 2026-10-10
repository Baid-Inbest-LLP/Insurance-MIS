import { useReport } from '../../hooks/useReports';
import { canViewCommission } from '../../lib/commission';
import { formatCurrency } from '../../utils/format';
import DataTable from '../../components/common/DataTable';
import ControlCenterToolbar from '../control-center/ControlCenterToolbar';
import ReportFilters from './ReportFilters';
import useReportScope from './useReportScope';

// The figures of a report row. `count` ones are plain numbers, the rest money; `commission` ones are shown only
// to people who may see commission; `className` colours the figure.
const PREMIUM_MEASURES = [
  { key: 'policies', header: 'Policies', count: true },
  { key: 'netPremium', header: 'Net Premium' },
  { key: 'gst', header: 'GST' },
  { key: 'premium', header: 'Premium' },
  { key: 'commission', header: 'Commission', commission: true },
];

// A report with one row per `groupKey` (lob, branch, ...) for one type (department), plus a totals row.
export default function GroupedReport({ title, report, groupKey, groupHeader, measures = PREMIUM_MEASURES }) {
  const scope = useReportScope();
  const { data, isLoading, isFetching } = useReport(report, scope.params, Boolean(scope.selected));

  const withCommission = canViewCommission(scope.user);
  const shown = measures.filter((measure) => !measure.commission || withCommission);
  const show = (measure, value) => {
    const text = measure.count ? value : formatCurrency(value);
    return measure.className ? <span className={measure.className}>{text}</span> : text;
  };

  const columns = [
    { key: groupKey, header: groupHeader, align: 'left', render: (row) => row[groupKey].name ?? '-' },
    ...shown.map((measure) => ({
      key: measure.key,
      header: measure.header,
      align: measure.count ? 'center' : 'right',
      render: (row) => show(measure, row[measure.key]),
    })),
  ];
  const totals = data?.totals;
  const footer = totals && {
    [groupKey]: 'Total',
    ...Object.fromEntries(shown.map((measure) => [measure.key, show(measure, totals[measure.key])])),
  };

  return (
    <div>
      <ControlCenterToolbar
        title={title}
        subtitle={`${scope.selected?.name ?? ''}${isFetching && !isLoading ? ' · updating…' : ''}`}
      />
      <ReportFilters scope={scope} groupKey={groupKey} />

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        rowKey={(row) => row[groupKey]._id ?? 'none'}
        loading={isLoading || !scope.ready}
        autoLayout
        noWrap
        serialNumber
        footer={footer}
        emptyTitle="No policies found"
        emptyDescription="Change the filters to see other policies"
      />
    </div>
  );
}
