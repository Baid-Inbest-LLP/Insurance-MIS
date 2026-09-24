// Escape regex metacharacters so free-text search input is treated as a literal
// substring — otherwise characters like `+`, `(`, `[` produce an invalid $regex.
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
