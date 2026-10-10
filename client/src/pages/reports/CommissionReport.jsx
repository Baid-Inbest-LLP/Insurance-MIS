import GroupedReport from './GroupedReport';

const MEASURES = [
  { key: 'policies', header: 'Policies', count: true },
  { key: 'premium', header: 'Premium' },
  { key: 'commission', header: 'Commission', commission: true },
  { key: 'received', header: 'Received', commission: true, className: 'commission-status-received' },
  { key: 'pending', header: 'Pending', commission: true, className: 'commission-status-pending' },
];

const CommissionReport = () => (
  <GroupedReport
    title="Commission Report"
    report="commission"
    groupKey="insurer"
    groupHeader="Insurer"
    measures={MEASURES}
  />
);

export default CommissionReport;
