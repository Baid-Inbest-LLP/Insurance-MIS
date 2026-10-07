import { KIND_LABELS } from '../../constants/transactions';

// Tailwind only keeps classes it finds written out in full, so the options are looked up instead of built from strings.
const BADGE_CLASSES = { gi: 'kind-badge-gi', li: 'kind-badge-li' };

// GI is green and LI is blue, in both themes.
export default function KindBadge({ kind }) {
  return <span className={BADGE_CLASSES[kind]}>{KIND_LABELS[kind]}</span>;
}
