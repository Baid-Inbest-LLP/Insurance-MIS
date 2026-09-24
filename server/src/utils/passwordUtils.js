import crypto from 'crypto';

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*';
const ALL = LOWER + UPPER + DIGITS + SPECIAL;

const randomChar = (chars) => chars[crypto.randomInt(chars.length)];

/** Generates a random password guaranteed to contain lower/upper/digit/special chars. */
export const generatePassword = (length = 12) => {
  const required = [randomChar(LOWER), randomChar(UPPER), randomChar(DIGITS), randomChar(SPECIAL)];
  const rest = Array.from({ length: length - required.length }, () => randomChar(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};
