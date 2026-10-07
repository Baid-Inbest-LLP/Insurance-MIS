const viewIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const editIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const deleteIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const restoreIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h5M4 9a8 8 0 1 1 2.343 6.657"
    />
  </svg>
);

function ActionButton({ icon, onClick, onPrefetch, disabled, title, ariaLabel, enabledClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      disabled={disabled}
      className={`settings-action-btn ${disabled ? 'settings-action-btn--disabled' : enabledClass}`}
      title={title}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
}

// View/edit/restore/delete icon buttons for a table's Actions column; omit a handler to hide its button.
export default function RowActions({
  onView,
  onEdit,
  onRestore,
  onDelete,
  viewProps = {},
  editProps = {},
  restoreProps = {},
  deleteProps = {},
  className = '',
}) {
  return (
    <div className={`flex items-center justify-center gap-0.5 ${className}`.trim()}>
      {onView && (
        <ActionButton
          icon={viewIcon}
          onClick={onView}
          onPrefetch={viewProps.onPrefetch}
          enabledClass="settings-action-btn--enabled"
          disabled={viewProps.disabled}
          title={viewProps.title ?? 'View'}
          ariaLabel={viewProps.ariaLabel ?? 'View'}
        />
      )}
      {onEdit && (
        <ActionButton
          icon={editIcon}
          onClick={onEdit}
          onPrefetch={editProps.onPrefetch}
          enabledClass="settings-action-btn--enabled"
          disabled={editProps.disabled}
          title={editProps.title ?? 'Edit'}
          ariaLabel={editProps.ariaLabel ?? 'Edit'}
        />
      )}
      {onRestore && (
        <ActionButton
          icon={restoreIcon}
          onClick={onRestore}
          enabledClass="settings-action-btn--enabled"
          disabled={restoreProps.disabled}
          title={restoreProps.title ?? 'Restore'}
          ariaLabel={restoreProps.ariaLabel ?? 'Restore'}
        />
      )}
      {onDelete && (
        <ActionButton
          icon={deleteIcon}
          onClick={onDelete}
          enabledClass="settings-action-btn--delete-enabled"
          disabled={deleteProps.disabled}
          title={deleteProps.title ?? 'Delete'}
          ariaLabel={deleteProps.ariaLabel ?? 'Delete'}
        />
      )}
    </div>
  );
}
