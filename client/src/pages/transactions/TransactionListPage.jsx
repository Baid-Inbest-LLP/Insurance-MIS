import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useMe } from '../../hooks/useAuth';
import {
  useDeleteTransaction,
  useDrafts,
  usePrefetchTransaction,
  useTransaction,
  useTransactions,
} from '../../hooks/useTransactions';
import { ROUTES } from '../../constants';
import { isHod, isStaffRole } from '../../constants/roles';
import { getApiErrorMessage } from '../../lib/queryClient';
import { formatCurrency, formatDate } from '../../utils/format';
import ControlCenterToolbar from '../control-center/ControlCenterToolbar';
import ConfirmModal from '../../components/common/ConfirmModal';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import RowActions from '../../components/common/RowActions';
import ReportFilters from '../reports/ReportFilters';
import useReportScope from '../reports/useReportScope';
import DraftsModal from './DraftsModal';
import KindBadge from './KindBadge';
import TransactionForm from './TransactionForm';

const LIMIT = 20;

// A table row has only the columns, so the full record is loaded for the form. The modal opens at once
// and shows placeholders until the record is there (usually it already is, loaded when the button was hovered).
function EditTransactionForm({ id, onClose }) {
  const { data: transaction, isFetching, error } = useTransaction(id);
  // Once the form is up it stays up; saving refetches the record and must not swap the form for placeholders.
  const shown = useRef(false);
  if (transaction && !isFetching) shown.current = true;

  useEffect(() => {
    if (!error) return;
    notifications.show({ message: getApiErrorMessage(error, 'Failed to load policy'), color: 'red' });
    onClose();
  }, [error, onClose]);

  if (shown.current) return <TransactionForm transaction={transaction} onClose={onClose} />;

  return (
    <Modal open size="xl" title="Edit Policy" subtitle="Loading the policy details..." onClose={onClose}>
      <div className="p-6 space-y-4">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <Skeleton key={row} className="h-9 w-full" />
        ))}
      </div>
    </Modal>
  );
}

export default function TransactionListPage() {
  const navigate = useNavigate();
  const { data: user } = useMe();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  // "new" while adding, the id of the transaction being edited, or null when the form is closed.
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  // The draft being finished in the form, or null.
  const [resumingDraft, setResumingDraft] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Type, filters and dates; changing one goes back to the first page.
  const scope = useReportScope({ allTypes: true, onChange: () => setPage(1) });
  const params = {
    page,
    limit: LIMIT,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...scope.params,
  };
  const { data, isLoading, isFetching } = useTransactions(params, scope.ready);
  const transactions = data?.transactions ?? [];
  const deleteTransaction = useDeleteTransaction();
  const prefetchTransaction = usePrefetchTransaction();
  const { data: drafts = [] } = useDrafts();

  const staff = isStaffRole(user?.role);
  const departmentIds = (user?.departments ?? []).map((department) => department._id);
  const canEdit = (transaction) =>
    !staff ||
    (departmentIds.includes(transaction.department) &&
      (isHod(user.role) || transaction.createdBy === user._id));
  const canDelete = (transaction) =>
    !staff || (isHod(user.role) && departmentIds.includes(transaction.department));

  const closeForm = useCallback(() => setEditing(null), []);

  const handleDelete = () => {
    deleteTransaction.mutate(confirmDelete._id, {
      onSuccess: () => notifications.show({ message: 'Policy deleted', color: 'green' }),
      onError: (err) =>
        notifications.show({ message: getApiErrorMessage(err, 'Delete failed'), color: 'red' }),
      onSettled: () => setConfirmDelete(null),
    });
  };

  const columns = [
    { key: 'policyDate', header: 'Policy Date', align: 'center', render: (t) => formatDate(t.policyDate) },
    {
      key: 'kind',
      header: 'Type',
      align: 'center',
      render: (t) => <KindBadge kind={t.kind} />,
    },
    { key: 'policyNo', header: 'Policy No.', align: 'center' },
    { key: 'clientName', header: 'Client Name', align: 'center', render: (t) => <span className="settings-user-name">{t.clientName}</span> },
    { key: 'insurer', header: 'Insurer', align: 'center', render: (t) => t.insurer?.name ?? '-' },
    { key: 'businessType', header: 'Business Type', align: 'center', render: (t) => t.businessType?.name ?? '-' },
    { key: 'lob', header: 'LOB', align: 'center', render: (t) => t.lob?.name ?? '-' },
    { key: 'branch', header: 'Branch', align: 'center', render: (t) => t.branch.code },
    { key: 'premium', header: 'Premium', align: 'right', render: (t) => formatCurrency(t.premium) },
    { key: 'source', header: 'Source', align: 'center' },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (t) => (
        <RowActions
          onView={() => navigate(`${ROUTES.TRANSACTIONS}/${t._id}`)}
          onEdit={() => setEditing(t._id)}
          onDelete={canDelete(t) ? () => setConfirmDelete(t) : undefined}
          viewProps={{ title: 'View Policy', ariaLabel: `View ${t.policyNo}`, onPrefetch: () => prefetchTransaction(t._id) }}
          editProps={{
            disabled: !canEdit(t),
            title: canEdit(t) ? 'Edit Policy' : 'You do not have permission to edit this policy',
            ariaLabel: `Edit ${t.policyNo}`,
            onPrefetch: () => prefetchTransaction(t._id),
          }}
          deleteProps={{ title: 'Delete Policy', ariaLabel: `Delete ${t.policyNo}` }}
        />
      ),
    },
  ];

  const total = data?.pagination?.total ?? 0;

  return (
    <div>
      <ControlCenterToolbar
        title="Policies"
        subtitle={`${total} polic${total !== 1 ? 'ies' : 'y'}${isFetching && !isLoading ? ' · updating…' : ''}`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search policy no. or client..."
        actions={
          drafts.length > 0 && (
            <button type="button" className="btn-secondary whitespace-nowrap w-full sm:w-auto" onClick={() => setShowDrafts(true)}>
              Drafts ({drafts.length})
            </button>
          )
        }
        showAction
        actionLabel="Add Policy"
        onAction={() => setEditing('new')}
      />

      <ReportFilters scope={scope} />

      <DataTable
        columns={columns}
        data={transactions}
        loading={isLoading || !scope.ready}
        autoLayout
        noWrap
        serialNumber
        emptyTitle="No policies found"
        emptyDescription="Add a policy or change the filters"
        pagination={data?.pagination && { ...data.pagination, onPageChange: setPage }}
      />

      {editing === 'new' && <TransactionForm onClose={closeForm} />}
      {editing && editing !== 'new' && <EditTransactionForm id={editing} onClose={closeForm} />}

      {showDrafts && (
        <DraftsModal
          drafts={drafts}
          onResume={(draft) => {
            setShowDrafts(false);
            setResumingDraft(draft);
          }}
          onClose={() => setShowDrafts(false)}
        />
      )}
      {resumingDraft && <TransactionForm draft={resumingDraft} onClose={() => setResumingDraft(null)} />}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Policy"
        message={`Are you sure you want to delete policy "${confirmDelete?.policyNo}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTransaction.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
