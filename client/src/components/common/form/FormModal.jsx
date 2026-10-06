import Modal from '../Modal';
import FormGrid from './FormGrid';

// A modal holding a form: header, a FormGrid for the fields, and Cancel/Submit buttons.
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
  align,
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
      align={align}
    >
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <FormGrid columns={columns} gap={gap}>
          {children}
        </FormGrid>

        <div className="company-form-footer">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
            {cancelLabel}
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
