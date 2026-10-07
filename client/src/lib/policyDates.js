// Dates are 'YYYY-MM-DD' strings (what <input type="date"> gives) and are read as calendar dates.
const parts = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
};

// Age in whole years on the given date, or '' while either date is missing.
export const ageOn = (dateOfBirth, on) => {
  const born = parts(dateOfBirth);
  const date = parts(on);
  if (!born || !date) return '';
  const hadBirthday = date.month > born.month || (date.month === born.month && date.day >= born.day);
  return date.year - born.year - (hadBirthday ? 0 : 1);
};

// The commencement date plus the policy term in years, or '' while either is missing.
export const maturityDate = (commencementDate, termYears) => {
  const date = parts(commencementDate);
  const years = Number(termYears);
  if (!date || !years) return '';
  return new Date(Date.UTC(date.year + years, date.month - 1, date.day)).toISOString().slice(0, 10);
};

// 'YYYY-MM-DD' as DD-MM-YYYY, the way date inputs show it.
export const displayDate = (value) => value.split('-').reverse().join('-');
