import { forwardRef, useEffect, useState } from 'react';
import { formatNumber } from '../../utils/format';

// Keeps only digits and a single decimal point (extra dots collapse into the fraction).
const sanitizeNumericInput = (str) => {
  const cleaned = str.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('')}` : whole;
};

// Text input that shows Indian comma grouping (e.g. 1,00,000.00) once you leave the
// field, but the raw digits while focused/typing — commas can't be typed into a
// native number input, so this trades type="number" for manual sanitization.
const CurrencyInput = forwardRef(function CurrencyInput(
  { value, onChange, onBlur, className = '', ...props },
  ref,
) {
  const [text, setText] = useState(value != null && value !== '' ? String(value) : '');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(value != null && value !== '' ? formatNumber(value) : '');
    }
  }, [value, focused]);

  const handleFocus = (e) => {
    setFocused(true);
    setText(value != null && value !== '' ? String(value) : '');
    props.onFocus?.(e);
  };

  const handleChange = (e) => {
    const raw = sanitizeNumericInput(e.target.value);
    setText(raw);
    onChange(raw);
  };

  const handleBlur = (e) => {
    setFocused(false);
    const num = Number(text);
    setText(text && !Number.isNaN(num) ? formatNumber(num) : '');
    onBlur?.(e);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
});

export default CurrencyInput;
