import { useId } from 'react';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

// Dialog shell: backdrop, panel and header. Callers render the body (and any footer) as children.
// With `scrollBody` the panel never grows past the screen: the header stays put and the caller's
// children should make their own middle section scroll (see FormModal).
export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  closeDisabled = false,
  size = 'md',
  scrollBody = false,
  children,
}) {
  const titleId = useId();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={closeDisabled ? undefined : onClose}
    >
      <div
        className={`company-form-panel ${SIZES[size]} ${scrollBody ? 'flex flex-col max-h-full mb-0' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="company-form-header shrink-0">
          <div>
            <h2 id={titleId} className="company-form-title">
              {title}
            </h2>
            {subtitle && <p className="company-form-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="company-form-close-btn"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
