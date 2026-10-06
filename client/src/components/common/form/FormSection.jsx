// A titled block that spans the full width of a FormGrid; put its own FormGrid inside for fields.
export default function FormSection({ title, hint, action, children }) {
  return (
    <section className="col-span-full">
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && <h3 className="company-form-section-title">{title}</h3>}
            {hint && <p className="company-form-section-hint">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
