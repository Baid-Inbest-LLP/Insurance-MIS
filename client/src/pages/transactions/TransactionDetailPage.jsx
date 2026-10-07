import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { COMMISSION_STATUSES, FREQUENCIES, TRANSACTION_KINDS } from '../../constants/transactions';
import { useMe } from '../../hooks/useAuth';
import { useTransaction } from '../../hooks/useTransactions';
import { canViewCommission } from '../../lib/commission';
import { getApiErrorMessage } from '../../lib/queryClient';
import { ageOn, maturityDate } from '../../lib/policyDates';
import { formatCurrency, formatDate } from '../../utils/format';
import Skeleton from '../../components/common/Skeleton';
import KindBadge from './KindBadge';

const day = (value) => (value ? String(value).slice(0, 10) : '');
const date = (value) => (value ? formatDate(value) : null);
const percent = (value) => (value === undefined || value === null ? null : `${value}%`);
const money = (value) => (value === undefined || value === null ? null : formatCurrency(value));

function Detail({ label, children }) {
  const empty = children === undefined || children === null || children === '';
  return (
    <div>
      <p className="detail-label">{label}</p>
      <p className="detail-value">{empty ? '-' : children}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="card p-6">
      <h3 className="company-form-section-title mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5">{children}</div>
    </section>
  );
}

function Stat({ label, children }) {
  return (
    <div className="card p-4">
      <p className="detail-label">{label}</p>
      <p className="detail-stat">{children || '-'}</p>
    </div>
  );
}

export default function TransactionDetailPage() {
  const { id } = useParams();
  const { data: user } = useMe();
  const { data: transaction, isLoading, error } = useTransaction(id);

  const backLink = (
    <Link to={ROUTES.TRANSACTIONS} className="btn-secondary whitespace-nowrap">
      ← Transactions
    </Link>
  );

  if (isLoading) {
    return (
      <div className="card p-6 space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-16">
        <p className="company-empty-title">{getApiErrorMessage(error, 'Transaction not found')}</p>
        <div className="mt-4">{backLink}</div>
      </div>
    );
  }

  const t = transaction;
  const commissionStatus = COMMISSION_STATUSES.find((item) => item.value === t.commission?.status) ?? {};
  const isGi = t.kind === TRANSACTION_KINDS.GI;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="control-center-toolbar-title text-lg font-semibold text-gray-900">
            {t.policyNo}{' '}
            <KindBadge kind={t.kind} />
          </h2>
          <p className="control-center-toolbar-subtitle text-sm text-gray-500 mt-0.5">
            {t.clientName} · {t.department.name}
          </p>
        </div>
        {backLink}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Premium">{money(t.premium)}</Stat>
        <Stat label="Policy Date">{date(t.policyDate)}</Stat>
        <Stat label="Insurer">{t.insurer?.name}</Stat>
        <Stat label="Line of Business">{t.lob?.name}</Stat>
      </div>

      <Section title="Policy">
        <Detail label="Policy No.">{t.policyNo}</Detail>
        <Detail label="Policy Date">{date(t.policyDate)}</Detail>
        <Detail label="Date of Entry">{date(t.entryDate)}</Detail>
        <Detail label="Client Name">{t.clientName}</Detail>
        <Detail label="Branch">{t.branch.code}</Detail>
        <Detail label="Office Code">{t.officeCode}</Detail>
        <Detail label="Location">{t.location}</Detail>
        <Detail label="Insurer">{t.insurer?.name}</Detail>
        <Detail label="Business Type">{t.businessType?.name}</Detail>
        <Detail label="Line of Business">{t.lob?.name}</Detail>
        {!isGi && <Detail label="Product Type">{t.productType?.name}</Detail>}
        <Detail label="Agent">{t.agent?.name}</Detail>
        <Detail label="Source">{t.source}</Detail>
        <Detail label="Reference">{t.reference}</Detail>
      </Section>

      {isGi ? (
        <Section title="Vehicle & Cover">
          <Detail label="Client GST">{t.clientGst}</Detail>
          <Detail label="Vehicle No.">{t.vehicleNo}</Detail>
          <Detail label="MFG Date">{date(t.mfgDate)}</Detail>
          <Detail label="Maker">{t.maker}</Detail>
          <Detail label="Model">{t.model}</Detail>
          <Detail label="NCB">{t.ncb === undefined ? null : `${t.ncb}%`}</Detail>
          <Detail label="Policy Period From">{date(t.policyPeriodFrom)}</Detail>
          <Detail label="Policy Period To">{date(t.policyPeriodTo)}</Detail>
        </Section>
      ) : (
        <Section title="Life Policy">
          <Detail label="Date of Birth">{date(t.dateOfBirth)}</Detail>
          <Detail label="Date of Commencement">{date(t.commencementDate)}</Detail>
          <Detail label="Age">{ageOn(day(t.dateOfBirth), day(t.commencementDate))}</Detail>
          <Detail label="Payment Term (Y)">{t.paymentTermYears}</Detail>
          <Detail label="Policy Term (Y)">{t.policyTermYears}</Detail>
          <Detail label="Maturity Date">{date(maturityDate(day(t.commencementDate), t.policyTermYears))}</Detail>
          <Detail label="Frequency">{FREQUENCIES.find((item) => item.value === t.frequency)?.label}</Detail>
          <Detail label="Next Due Date">{date(t.nextDueDate)}</Detail>
          <Detail label="Actual Payment Date">{date(t.actualPaymentDate)}</Detail>
        </Section>
      )}

      <Section title="Premium">
        {isGi ? (
          <>
            <Detail label="OD Premium">{money(t.odPremium)}</Detail>
            <Detail label="Third-party Cover">{money(t.thirdPartyCover)}</Detail>
            <Detail label="Agent Stamp Duty">{money(t.agentStampDuty)}</Detail>
          </>
        ) : (
          <>
            <Detail label="Premium Per Month">{money(t.premiumPerMonth)}</Detail>
            <Detail label="Sum Assured">{money(t.sumAssured)}</Detail>
          </>
        )}
        <Detail label="Net Premium">{money(t.netPremium)}</Detail>
        <Detail label="GST">{money(t.gst)}</Detail>
        <Detail label="Premium">{money(t.premium)}</Detail>
      </Section>

      {canViewCommission(user) && (
        <Section title="Commission">
          {t.commission ? (
            <>
              {isGi ? (
                <>
                  <Detail label="OD Commission">{money(t.commission.odCommission)}</Detail>
                  <Detail label="TP Commission">{money(t.commission.tpCommission)}</Detail>
                  <Detail label="Total Commission">{money(t.commission.totalCommission)}</Detail>
                  <Detail label="OD Commission (%)">{percent(t.commission.odCommissionPercent)}</Detail>
                  <Detail label="TP Commission (%)">{percent(t.commission.tpCommissionPercent)}</Detail>
                  <Detail label="Total Commission (%)">{percent(t.commission.totalCommissionPercent)}</Detail>
                </>
              ) : (
                <>
                  <Detail label="Commission">{money(t.commission.amount)}</Detail>
                  <Detail label="Commission (%)">{percent(t.commission.percent)}</Detail>
                </>
              )}
              <Detail label="Commission Status">
                <span className={commissionStatus.className}>{commissionStatus.label}</span>
              </Detail>
            </>
          ) : (
            <Detail label="Commission">No commission added yet</Detail>
          )}
        </Section>
      )}

      <Section title="Record">
        <Detail label="Created By">{t.createdBy?.name}</Detail>
        <Detail label="Created On">{date(t.createdAt)}</Detail>
        <Detail label="Last Updated">{date(t.updatedAt)}</Detail>
      </Section>
    </div>
  );
}
