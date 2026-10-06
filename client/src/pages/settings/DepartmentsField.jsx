import { Controller } from 'react-hook-form';
import FormField from '../../components/common/form/FormField';

// Department checkboxes, shown for roles that belong to one or more departments.
export default function DepartmentsField({ control, errors, departments }) {
  return (
    <FormField label="Departments" error={errors.departments}>
      <Controller
        name="departments"
        control={control}
        rules={{ validate: (ids) => ids.length > 0 || 'Select at least one department' }}
        render={({ field }) => (
          <div className="checkbox-group">
            {departments.length === 0 && <p className="text-gray-400">No active departments</p>}
            {departments.map((d) => (
              <label key={d._id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.value.includes(d._id)}
                  onChange={() =>
                    field.onChange(
                      field.value.includes(d._id)
                        ? field.value.filter((id) => id !== d._id)
                        : [...field.value, d._id],
                    )
                  }
                />
                {d.name}
              </label>
            ))}
          </div>
        )}
      />
    </FormField>
  );
}
