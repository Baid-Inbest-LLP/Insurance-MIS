import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import ConfirmModal from '../../components/common/ConfirmModal';
import Modal from '../../components/common/Modal';
import { useDeleteDraft } from '../../hooks/useTransactions';
import { getApiErrorMessage } from '../../lib/queryClient';
import KindBadge from './KindBadge';

const savedAt = (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// The user's saved drafts; `onResume` receives the draft to continue filling in.
export default function DraftsModal({ drafts, onResume, onClose }) {
  const deleteDraft = useDeleteDraft();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = () => {
    deleteDraft.mutate(confirmDelete._id, {
      onSuccess: () => notifications.show({ message: 'Draft Policy deleted', color: 'green' }),
      onError: (err) => notifications.show({ message: getApiErrorMessage(err, 'Delete failed'), color: 'red' }),
      onSettled: () => setConfirmDelete(null),
    });
  };

  return (
    <>
      <Modal open size="lg" title="Drafts" subtitle="Unfinished policies you saved" onClose={onClose}>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {drafts.length === 0 ? (
            <p className="draft-meta text-center py-6">No drafts</p>
          ) : (
            drafts.map((draft) => (
              <div key={draft._id} className="draft-item">
                <div className="flex items-center gap-3 min-w-0">
                  <KindBadge kind={draft.kind} />
                  <div className="min-w-0">
                    <p className="draft-title truncate">{draft.data.policyNo || 'No policy number yet'}</p>
                    <p className="draft-meta truncate">
                      {draft.data.clientName || 'No client name yet'} · Saved {savedAt(draft.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" className="btn-primary" onClick={() => onResume(draft)}>
                    Resume
                  </button>
                  <button type="button" className="btn-danger" onClick={() => setConfirmDelete(draft)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Draft"
        message="Are you sure you want to delete this draft? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteDraft.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
