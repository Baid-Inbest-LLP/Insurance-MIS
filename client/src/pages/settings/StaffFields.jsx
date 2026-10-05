import { DEPARTMENTS } from '../../constants/roles';

// Location and department selects, shown for roles tied to a city and a department.
export default function StaffFields({ register, errors, cities }) {
  return (
    <>
      <div>
        <label className="company-form-field-label">Location</label>
        <select
          className="input-field"
          {...register('locationCity', { required: 'Location is required' })}
        >
          <option value="">Select location</option>
          {cities.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.locationCity && (
          <p className="text-red-500 text-xs mt-1">{errors.locationCity.message}</p>
        )}
      </div>

      <div>
        <label className="company-form-field-label">Department</label>
        <select
          className="input-field"
          {...register('department', { required: 'Department is required' })}
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {errors.department && (
          <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>
        )}
      </div>
    </>
  );
}
