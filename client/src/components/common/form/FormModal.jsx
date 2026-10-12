import Modal from '../Modal';
import Spinner from '../Spinner';
import FormGrid from './FormGrid';

// A modal holding a form: a fixed header, a scrolling FormGrid for the fields, and fixed Cancel/Submit buttons.
// Pass `onSubmit={handleSubmit(fn)}` from react-hook-form; children are FormFields or FormSections.
// While `busy` (some work other than saving is running) an overlay with `busyLabel` covers the form,
// nothing in it can be clicked or focused, and the modal cannot be closed.
export default function FormModal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitting = false,
  busy = false,
  busyLabel,
  submitLabel = 'Save',
  submittingLabel = 'Saving...',
  cancelLabel = 'Cancel',
  size,
  columns = 1,
  gap,
  children,
}) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      closeDisabled={submitting || busy}
      size={size}
      scrollBody
    >
      <form onSubmit={onSubmit} className="relative flex flex-col min-h-0 flex-1">
        {busy && (
          <div className="form-busy-overlay" role="status" aria-live="polite">
            <Spinner className="w-8 h-8" />
            {busyLabel && <span>{busyLabel}</span>}
          </div>
        )}

        {/* `inert` takes the fields and buttons out of reach (mouse and keyboard) without restyling them. */}
        <div inert={busy} className="contents">
          <div className="p-6 overflow-y-auto">
            <FormGrid columns={columns} gap={gap}>
              {children}
            </FormGrid>
          </div>

          <div className="company-form-footer shrink-0 px-6 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
              {cancelLabel}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  {submittingLabel}
                </span>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
