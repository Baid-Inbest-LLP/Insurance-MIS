/** BRO 1 → BRO1, hq → HQ */
export const normalizeBranchLabel = (label) =>
  String(label || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

/** Branch label only — used in dropdowns and branch names */
export const buildBranchName = (label) => normalizeBranchLabel(label);
