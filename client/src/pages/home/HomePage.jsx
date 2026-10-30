import { IconChartBar, IconCurrencyRupee, IconFileCertificate, IconUsers } from '@tabler/icons-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import { formatCompactCurrency, formatCurrency, formatDate } from '../../utils/format';

const COLORS = ['#0f6b8d', '#32875d', '#c38a29', '#7460a8', '#c46758', '#3f7fa7', '#a85c83', '#607d8b', '#b06c90', '#718b3d'];
const currentFinancialYear = () => {
  const today = new Date();
  return today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
};
const fallbackFinancialYears = () => Array.from({ length: 6 }, (_, index) => {
  const year = currentFinancialYear() - index;
  return { value: String(year), label: `${year}-${year + 1}` };
});
const financialYearRange = (year) => ({
  from: `${year}-04-01`,
  to: year < currentFinancialYear() ? `${year + 1}-03-31` : '',
});
const periodParams = (year) => financialYearRange(Number(year));
const nonEmptyParams = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value));
const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'short' });
const companyFirstWord = (name) => String(name || 'Unspecified').trim().split(/\s+/)[0];

const topProductsWithOthers = (rows) => {
  const top = rows.slice(0, 9);
  const rest = rows.slice(9);
  return rest.length ? [...top, { id: 'others', name: 'Others', policies: rest.reduce((sum, row) => sum + row.policies, 0), premium: rest.reduce((sum, row) => sum + row.premium, 0) }] : top;
};

function ChartCard({ title, children, className = '' }) {
  return <section className={`card dashboard-card p-4 min-w-0 ${className}`}><div className="flex items-center justify-between gap-3 mb-3">{title}</div>{children}</section>;
}

function PeriodSelect({ value, onChange, years }) {
  const selectableYears = years?.length ? [...new Set([currentFinancialYear(), ...years])] : fallbackFinancialYears();
  const options = selectableYears.map((year) => typeof year === 'number' ? { value: String(year), label: `${year}-${year + 1}` } : year);
  return <select className="dashboard-period-select input-field w-32 text-xs" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Financial year">{options.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}</select>;
}

function EmptyChart() { return <div className="dashboard-muted h-56 grid place-items-center text-sm text-gray-500">No policy data for this period</div>; }

function PremiumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const heading = payload[0]?.payload?.fullName ?? payload[0]?.payload?.name ?? label;
  return <div className="dashboard-tooltip bg-white border border-gray-200 shadow-sm rounded px-3 py-2 text-xs"><p className="font-semibold mb-1">{heading}</p>{payload.map((item) => <p key={item.name}>{item.name}: {item.name === 'Policies' ? item.value : formatCurrency(item.value)}</p>)}</div>;
}

function ProductLegend({ rows }) {
  return <div className="dashboard-product-legend grid grid-cols-2 gap-x-3 gap-y-1 mt-1 text-[11px]">{rows.map((row, index) => <span key={row.id ?? row.name} title={row.name} className="flex min-w-0 items-center gap-1 text-gray-600"><i className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="truncate">{row.name}</span></span>)}</div>;
}

function Ranking({ rows, onSelect }) {
  if (!rows.length) return <EmptyChart />;
  const maximum = Math.max(...rows.map((row) => row.premium), 1);
  return <div className="space-y-2">{rows.slice(0, 8).map((row) => <button type="button" key={row.id ?? row.name} onClick={() => onSelect(row)} className="dashboard-ranking-row w-full text-left group"><div className="flex justify-between gap-3 text-xs mb-1"><span className="dashboard-ranking-name truncate text-gray-700">{row.name}</span><span className="dashboard-ranking-value font-medium text-gray-900 whitespace-nowrap">{formatCompactCurrency(row.premium)}</span></div><div className="dashboard-ranking-track h-2 bg-gray-100 rounded overflow-hidden"><div className="h-full bg-teal-700 rounded group-hover:bg-teal-600" style={{ width: `${(row.premium / maximum) * 100}%` }} /></div></button>)}</div>;
}

function RecentPolicies({ rows, onSelect }) {
  if (!rows.length) return <div className="h-56 grid place-items-center text-sm text-gray-500">No recent policies</div>;
  return <div className="dashboard-recent-list divide-y divide-gray-100">{rows.map((row) => <button type="button" key={row._id} onClick={() => onSelect({})} className="dashboard-recent-row w-full py-2 text-left grid grid-cols-[1fr_auto] gap-3"><span className="min-w-0"><span className="dashboard-recent-client block text-sm font-medium truncate">{row.clientName}</span><span className="dashboard-recent-meta block text-xs text-gray-500 truncate">{row.policyNo} - {row.insurer} - {formatDate(row.policyDate)}</span></span><span className="dashboard-recent-premium text-sm font-semibold whitespace-nowrap">{formatCurrency(row.premium)}</span></button>)}</div>;
}

// Every panel owns its period and request. Adjusting one component therefore
// never alters the numbers or date range shown by another component.
function DashboardPanel({ heading, section, years, className, children, onDrillDown }) {
  const [period, setPeriod] = useState(() => String(currentFinancialYear()));
  const params = useMemo(() => nonEmptyParams(periodParams(period)), [period]);
  const { data, isLoading, isError } = useDashboard({ ...params, section });
  const title = <><h2 className="dashboard-heading text-sm font-semibold text-gray-800">{heading}</h2><PeriodSelect value={period} onChange={setPeriod} years={years} /></>;
  const body = isLoading ? <div className="dashboard-muted h-56 grid place-items-center text-sm text-gray-500">Loading…</div> : isError ? <div className="h-56 grid place-items-center text-sm text-red-500">Could not load this panel. Please retry.</div> : children({ data, drillDown: (extra = {}) => onDrillDown(params, extra) });
  return <ChartCard title={title} className={className}>{body}</ChartCard>;
}

function Overview({ onDrillDown, years }) {
  const [period, setPeriod] = useState(() => String(currentFinancialYear()));
  const params = useMemo(() => nonEmptyParams(periodParams(period)), [period]);
  const { data, isLoading, isError } = useDashboard({ ...params, section: 'overview' });
  const kpis = data?.kpis;
  const cards = [
    { label: 'Total Premium', value: formatCurrency(kpis?.premium), Icon: IconCurrencyRupee, tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Policies / NOP', value: kpis?.policies ?? 0, Icon: IconFileCertificate, tone: 'bg-blue-100 text-blue-700' },
    { label: 'Unique Client Names', value: kpis?.activeClientNames ?? 0, Icon: IconUsers, tone: 'bg-violet-100 text-violet-700' },
    ...(data?.permissions?.commission ? [{ label: 'Commission', value: formatCurrency(kpis?.commission), Icon: IconChartBar, tone: 'bg-amber-100 text-amber-700' }] : []),
  ];
  return <section className="dashboard-overview space-y-3"><div className="flex justify-end"><PeriodSelect value={period} onChange={setPeriod} years={years} /></div>{isError ? <div className="card p-4 text-sm text-red-500">Dashboard overview could not be loaded. Please retry.</div> : <div className="dashboard-grid-4">{cards.map(({ label, value, Icon, tone }) => <button key={label} type="button" onClick={() => onDrillDown(params)} className="dashboard-kpi-card card p-4 flex text-left items-center gap-3"><span className={`stat-icon-box ${tone}`}><Icon stroke={1.8} /></span><span className="min-w-0"><span className="dashboard-kpi-label block text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{label}</span><span className="dashboard-kpi-value text-xl font-bold text-gray-900">{isLoading ? '-' : value}</span></span></button>)}</div>}</section>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: yearData } = useDashboard({ section: 'years' });
  const years = yearData?.years ?? [];
  const drillDown = (params, extra = {}) => navigate(`/transactions?${new URLSearchParams({ ...params, ...extra }).toString()}`);

  return <div className="space-y-4">
    <Overview onDrillDown={drillDown} years={years} />
    <div className="dashboard-grid-trend-company">
      <DashboardPanel heading="Monthly Premium Collection" section="monthly" years={years} onDrillDown={drillDown}>{({ data }) => {
        const rows = data?.monthly.map((row) => ({ ...row, label: monthLabel(row.month) })) ?? [];
        return rows.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={rows}><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tickFormatter={formatCompactCurrency} width={72} tick={{ fontSize: 11 }} /><Tooltip content={<PremiumTooltip />} cursor={false} /><Bar dataKey="premium" name="Premium" fill="#0f6b8d" radius={[4, 4, 0, 0]} activeBar={false} /></BarChart></ResponsiveContainer> : <EmptyChart />;
      }}</DashboardPanel>
      <DashboardPanel heading="Product Types" section="products" years={years} onDrillDown={drillDown}>{({ data, drillDown: open }) => {
        const rows = topProductsWithOthers(data?.productTypes ?? []);
        return rows.length ? <><ResponsiveContainer width="100%" height={185}><PieChart><Pie data={rows} dataKey="premium" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2} onClick={(row) => row.id !== 'others' && open({ productType: row.name })}>{rows.map((row, index) => <Cell key={row.id ?? row.name} fill={COLORS[index % COLORS.length]} cursor={row.id === 'others' ? 'default' : 'pointer'} />)}</Pie><Tooltip content={<PremiumTooltip />} /></PieChart></ResponsiveContainer><ProductLegend rows={rows} /></> : <EmptyChart />;
      }}</DashboardPanel>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <DashboardPanel heading="Companies Wise Premium" section="companies" years={years} className="xl:col-span-2" onDrillDown={drillDown}>{({ data, drillDown: open }) => {
        const rows = (data?.insurers ?? []).slice(0, 9).map((row) => ({ ...row, fullName: row.name, name: companyFirstWord(row.name) }));
        return rows.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={rows} layout="vertical" margin={{ left: 4, right: 12 }}><XAxis type="number" tickFormatter={formatCompactCurrency} /><YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11 }} /><Tooltip content={<PremiumTooltip />} cursor={false} /><Bar dataKey="premium" name="Premium" fill="#7460a8" radius={[0, 4, 4, 0]} activeBar={false} onClick={(row) => open({ insurer: row.id })} /></BarChart></ResponsiveContainer> : <EmptyChart />;
      }}</DashboardPanel>
      <div className="space-y-4"><DashboardPanel heading="Source Wise Premium" section="sources" years={years} onDrillDown={drillDown}>{({ data, drillDown: open }) => <Ranking rows={data?.sources ?? []} onSelect={(row) => open({ source: row.id })} />}</DashboardPanel><DashboardPanel heading="Office Wise Premium" section="offices" years={years} onDrillDown={drillDown}>{({ data, drillDown: open }) => <Ranking rows={data?.offices ?? []} onSelect={(row) => open({ branch: row.id })} />}</DashboardPanel></div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><DashboardPanel heading="Business Types" section="business-types" years={years} onDrillDown={drillDown}>{({ data, drillDown: open }) => <Ranking rows={data?.businessTypes ?? []} onSelect={(row) => open({ businessType: row.id })} />}</DashboardPanel><DashboardPanel heading="Recent Policies" section="recent" years={years} onDrillDown={drillDown}>{({ data, drillDown: open }) => <RecentPolicies rows={data?.recentPolicies ?? []} onSelect={open} />}</DashboardPanel></div>
  </div>;
}
