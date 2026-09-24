import {
  IconCalendarDue,
  IconCurrencyRupee,
  IconFileCertificate,
  IconReportMedical,
} from '@tabler/icons-react';
import PageBanner from '../../components/common/PageBanner';
import { useMe } from '../../hooks/useAuth';

const stats = [
  { label: 'Active Policies', Icon: IconFileCertificate, tone: 'bg-blue-100 text-blue-700' },
  { label: 'Total Premium', Icon: IconCurrencyRupee, tone: 'bg-emerald-100 text-emerald-700' },
  { label: 'Open Claims', Icon: IconReportMedical, tone: 'bg-amber-100 text-amber-700' },
  { label: 'Renewals Due', Icon: IconCalendarDue, tone: 'bg-rose-100 text-rose-700' },
];

export default function HomePage() {
  const { data: user } = useMe();

  return (
    <div className="space-y-4">
      <PageBanner
        title={`Welcome${user?.name ? `, ${user.name}` : ''}`}
        subtitle="Insurance MIS overview"
      />

      <div className="dashboard-grid-4">
        {stats.map(({ label, Icon, tone }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`stat-icon-box ${tone}`}>
              <Icon stroke={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">
                {label}
              </p>
              <p className="text-xl font-bold text-gray-900">—</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-800">Getting started</h3>
        <p className="text-sm text-gray-500 mt-1">
          Set up companies and branches in the Control Center, then add users from Settings.
          Insurance modules (policies, claims, renewals, reports) will plug into this dashboard.
        </p>
      </div>
    </div>
  );
}
