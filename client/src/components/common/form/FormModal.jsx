import Modal from '../Modal';
import Spinner from '../Spinner';
import FormGrid from './FormGrid';

// A modal holding a form: a fixed header, a scrolling FormGrid for the fields, and fixed Cancel/Submit buttons.
// Pass `onSubmit={handleSubmit(fn)}` from react-hook-form; children are FormFields or FormSections.
export default function FormModal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitting = false,
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
      closeDisabled={submitting}
      size={size}
      scrollBody
    >
      <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
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
      </form>
    </Modal>
  );
}
