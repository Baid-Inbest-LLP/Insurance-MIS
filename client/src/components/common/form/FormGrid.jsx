// Tailwind needs complete class names, so the options are looked up instead of built from strings.
const COLUMNS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' };
const GAPS = { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' };

// Responsive grid for form fields: one column on small screens, `columns` from the sm breakpoint up.
export default function FormGrid({ columns = 1, gap = 'md', children }) {
  return <div className={`grid grid-cols-1 ${COLUMNS[columns]} ${GAPS[gap]}`}>{children}</div>;
}
