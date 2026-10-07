import { Controller } from 'react-hook-form';
import { DateInput } from '@mantine/dates';
import FormField from './FormField';

// Turns typed "DD-MM-YYYY" (or / or .) into the 'YYYY-MM-DD' string the form stores; null when it is not a real date.
const parseTypedDate = (input) => {
  const match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(input.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
};

// Date inputs share one look: a typed or picked date shown as DD-MM-YYYY.
export const dateInputProps = {
  valueFormat: 'DD-MM-YYYY',
  placeholder: 'DD-MM-YYYY',
  dateParser: parseTypedDate,
  clearable: true,
  classNames: { input: 'input-field' },
  styles: { input: { height: 'auto', minHeight: 0 } },
};

// A labelled date picker bound to a react-hook-form field; the value is a 'YYYY-MM-DD' string or ''.
export default function DateField({ label, name, control, required = false, minDate, maxDate, hint }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: required && `${label} is required` }}
      render={({ field, fieldState }) => (
        <FormField label={label} required={required} error={fieldState.error} hint={hint}>
          <DateInput
            {...dateInputProps}
            value={field.value || null}
            onChange={(value) => field.onChange(value ?? '')}
            onBlur={field.onBlur}
            minDate={minDate || undefined}
            maxDate={maxDate || undefined}
          />
        </FormField>
      )}
    />
  );
}
