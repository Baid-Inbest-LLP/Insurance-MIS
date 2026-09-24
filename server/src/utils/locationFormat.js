/** BRO 1 → BRO1, hq → HQ */
export const normalizeBranchLabel = (label) =>
  String(label || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

/** Branch label only — used in dropdowns and location names */
export const buildLocationName = (label) => normalizeBranchLabel(label);

/** Normalize stored / submitted location to label-only */
export const toLocationLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.includes('—')) {
    return normalizeBranchLabel(raw.split('—')[0]);
  }
  if (raw.includes(' - ')) {
    return normalizeBranchLabel(raw.split(' - ')[0]);
  }
  return normalizeBranchLabel(raw);
};
