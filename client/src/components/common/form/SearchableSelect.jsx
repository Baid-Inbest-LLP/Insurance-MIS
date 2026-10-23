import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Button, Select } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import FormField from './FormField';

// A field you can type into to find an option. `items` are { _id, name }; the form stores the chosen _id.
// `current` keeps a saved option listed even if it left `items`. With `onCreate`, a name with no match can be added:
// it gets the typed name and resolves to the new { _id, name }, or to nothing when it failed.
export default function SearchableSelect({ label, name, control, items = [], current, required = false, onCreate }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // New options stay listed until the parent's list has reloaded and contains them.
  const [added, setAdded] = useState([]);

  const seen = new Set();
  const data = [...items, ...(current ? [current] : []), ...added]
    .filter((item) => !seen.has(item._id) && seen.add(item._id))
    .map((item) => ({ value: item._id, label: item.name }));
  const typed = search.trim();
  const noun = label.toLowerCase();

  const create = async (field) => {
    setCreating(true);
    let item;
    try {
      item = await onCreate(typed);
    } finally {
      setCreating(false);
    }
    if (!item) return;

    setAdded((list) => [...list, item]);
    field.onChange(item._id);
    setSearch(item.name);
    setOpen(false);
  };

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: required && `${label} is required` }}
      render={({ field, fieldState }) => (
        <FormField label={label} required={required} error={fieldState.error}>
          <Select
            data={data}
            value={field.value || null}
            onChange={(value) => field.onChange(value ?? '')}
            onBlur={field.onBlur}
            searchValue={search}
            onSearchChange={setSearch}
            dropdownOpened={open}
            onDropdownOpen={() => setOpen(true)}
            onDropdownClose={() => setOpen(false)}
            placeholder={`Search ${noun}`}
            nothingFoundMessage={
              onCreate && typed ? (
                <Button variant="light" size="xs" fullWidth leftSection={<IconPlus size={14} />} loading={creating} onClick={() => create(field)}>
                  {`Add ${noun} "${typed}"`}
                </Button>
              ) : data.length ? (
                'No match'
              ) : (
                `No ${noun}s added yet`
              )
            }
            searchable
            clearable
            classNames={{ input: 'input-field' }}
            styles={{ input: { height: 'auto', minHeight: 0 } }}
          />
        </FormField>
      )}
    />
  );
}
