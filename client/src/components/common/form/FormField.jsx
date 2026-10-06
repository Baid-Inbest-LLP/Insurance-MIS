const SPANS = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  full: 'col-span-full',
};

// A labelled field for a FormGrid. `error` can be a message or a react-hook-form error object.
export default function FormField({ label, required = false, error, hint, span = 1, children }) {
  const message = typeof error === 'string' ? error : error?.message;

  return (
    <div className={SPANS[span]}>
      {label && (
        <label className="company-form-field-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {message && <p className="text-red-500 text-xs mt-1">{message}</p>}
      {hint && <p className="company-form-section-hint mt-1">{hint}</p>}
    </div>
  );
}
