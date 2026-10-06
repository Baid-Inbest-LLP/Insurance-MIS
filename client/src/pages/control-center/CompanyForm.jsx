import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useCreateCompany, useUpdateCompany } from '../../hooks/useCompanies';
import { useLocationCities } from '../../hooks/useMasters';
import { getApiErrorMessage } from '../../lib/queryClient';
import FormField from '../../components/common/form/FormField';
import FormGrid from '../../components/common/form/FormGrid';
import FormModal from '../../components/common/form/FormModal';
import FormSection from '../../components/common/form/FormSection';

const PHONE_REGEX = /^(\+91|91)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyLocation = (isFirst = false) => ({
  label: isFirst ? 'HQ' : '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'India',
  isDefault: isFirst,
});

const buildDefaultValues = (company) => ({
  name: company?.name || '',
  companyCode: company?.companyCode || '',
  email: company?.email || '',
  phone: company?.phone || '',
  taxId: company?.taxId || '',
  isActive: company ? company.isActive !== false : true,
  locations: company?.locations?.length
    ? company.locations.map((l) => ({ ...l, label: (l.label || '').toUpperCase() }))
    : [emptyLocation(true)],
});

export default function CompanyForm({ company, onClose }) {
  const isEdit = Boolean(company);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const { data: locationCities = [] } = useLocationCities();
  const submitting = createCompany.isPending || updateCompany.isPending;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: buildDefaultValues(company) });

  const { fields, append, remove } = useFieldArray({ control, name: 'locations' });
  // fields[] only holds each row's initial values; watch for the live values (badges, headers).
  const locations = useWatch({ control, name: 'locations' }) || [];

  const cityOptionsFor = (loc) => {
    const options = [...locationCities];
    if (loc.city && !options.some((c) => c._id === loc.city)) {
      options.push({ _id: loc.city, name: loc.cityName || '' });
    }
    return options;
  };

  const registerUpper = (name, rules) => {
    const field = register(name, rules);
    return {
      ...field,
      onChange: (e) => {
        e.target.value = e.target.value.toUpperCase();
        return field.onChange(e);
      },
    };
  };

  const setDefault = (idx) => {
    locations.forEach((_, i) => setValue(`locations.${i}.isDefault`, i === idx));
  };

  const addLocation = () => append(emptyLocation(false));

  const removeLocation = (idx) => {
    if (fields.length <= 1) {
      notifications.show({ message: 'At least one location required', color: 'red' });
      return;
    }
    remove(idx);
    const remaining = getValues('locations');
    if (remaining.length && !remaining.some((l) => l.isDefault)) {
      setValue('locations.0.isDefault', true);
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      companyCode: data.companyCode.toUpperCase(),
      taxId: data.taxId.toUpperCase(),
    };

    try {
      if (isEdit) {
        await updateCompany.mutateAsync({ id: company._id, data: payload });
      } else {
        await createCompany.mutateAsync(payload);
      }
      notifications.show({
        message: isEdit ? 'Company updated' : 'Company created',
        color: 'green',
      });
      onClose();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Something went wrong'),
        color: 'red',
      });
    }
  };

  const inputCls = (err) => `input-field text-sm ${err ? 'border-red-400 focus:ring-red-400' : ''}`;

  return (
    <FormModal
      open
      size="lg"
      align="start"
      gap="lg"
      title={isEdit ? 'Edit Company' : 'Add New Company'}
      subtitle={
        isEdit ? 'Update company info and locations' : 'Add company details and branch locations'
      }
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitting={submitting}
      submitLabel={isEdit ? 'Update Company' : 'Create Company'}
    >
      <FormSection title="Company Information">
        <FormGrid columns={2}>
          <FormField label="Company Name" required error={errors.name} span="full">
            <input
              className={inputCls(errors.name)}
              placeholder="Baid Inbest Llp"
              {...register('name', { required: 'Company name is required' })}
            />
          </FormField>

          <FormField label="Company Code" required error={errors.companyCode}>
            <input
              className={`${inputCls(errors.companyCode)} font-mono`}
              placeholder="e.g. BILLP"
              {...registerUpper('companyCode', { required: 'Company code is required' })}
            />
          </FormField>

          <FormField label="Email" error={errors.email}>
            <input
              type="email"
              className={inputCls(errors.email)}
              placeholder="info@company.com"
              {...register('email', {
                pattern: { value: EMAIL_REGEX, message: 'Enter a valid email address' },
              })}
            />
          </FormField>

          <FormField label="Phone" error={errors.phone}>
            <input
              className={inputCls(errors.phone)}
              placeholder="e.g. 9876543210"
              maxLength={13}
              {...register('phone', {
                validate: (value) =>
                  !value ||
                  PHONE_REGEX.test(value.replace(/\s/g, '')) ||
                  'Enter a valid Indian phone number (e.g. 9876543210 or +919876543210)',
              })}
            />
          </FormField>

          <FormField label="GST No" error={errors.taxId}>
            <input
              className={`${inputCls(errors.taxId)} uppercase`}
              placeholder="e.g. 27AAPFU0939F1ZV"
              maxLength={15}
              {...registerUpper('taxId', {
                validate: (value) =>
                  !value ||
                  GST_REGEX.test(value.toUpperCase()) ||
                  'Enter a valid GST number (e.g. 27AAPFU0939F1ZV)',
              })}
            />
          </FormField>
        </FormGrid>

        <div className="flex items-center gap-2 mt-3">
          <input type="checkbox" id="companyActive" className="rounded" {...register('isActive')} />
          <label htmlFor="companyActive" className="company-form-checkbox-label">
            Active company
          </label>
        </div>
      </FormSection>

      <FormSection
        title="Locations / Branch Addresses"
        hint="Add one or more locations for this company"
        action={
          <button type="button" onClick={addLocation} className="btn-secondary text-xs py-1.5 px-3">
            + Add Location
          </button>
        }
      >
        <div className="space-y-4">
          {fields.map((field, idx) => {
            const loc = locations[idx] || field;
            const locErrors = errors.locations?.[idx] || {};
            return (
              <div
                key={field.id}
                className={`company-location-form-card ${
                  loc.isDefault ? 'company-location-form-card--default' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`company-location-index ${
                        loc.isDefault ? 'company-location-index--default' : ''
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="company-location-form-title">
                      {(loc.label || `Location ${idx + 1}`)?.toUpperCase?.()}
                    </span>
                    {loc.isDefault && <span className="company-location-default-pill">Default</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!loc.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefault(idx)}
                        className="company-location-set-default"
                      >
                        Set as default
                      </button>
                    )}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(idx)}
                        className="company-location-remove-btn"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <FormGrid columns={2} gap="sm">
                  <FormField label="Location Name" required error={locErrors.label} span="full">
                    <input
                      className={inputCls(locErrors.label)}
                      placeholder='e.g. "HQ", "BRO 1"'
                      {...registerUpper(`locations.${idx}.label`, {
                        required: 'Location name is required',
                      })}
                    />
                  </FormField>

                  <FormField label="Street Address" required error={locErrors.street} span="full">
                    <input
                      className={inputCls(locErrors.street)}
                      placeholder="123 Main Street"
                      {...register(`locations.${idx}.street`, {
                        required: 'Street address is required',
                      })}
                    />
                  </FormField>

                  <FormField label="City" required error={locErrors.city}>
                    <select
                      className={inputCls(locErrors.city)}
                      {...register(`locations.${idx}.city`, { required: 'City is required' })}
                    >
                      <option value="">Select city</option>
                      {cityOptionsFor(loc).map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="State / Province" required error={locErrors.state}>
                    <input
                      className={inputCls(locErrors.state)}
                      placeholder="State"
                      {...register(`locations.${idx}.state`, { required: 'State is required' })}
                    />
                  </FormField>

                  <FormField label="ZIP / Postal Code" required error={locErrors.zipCode}>
                    <input
                      className={inputCls(locErrors.zipCode)}
                      placeholder="ZIP Code"
                      {...register(`locations.${idx}.zipCode`, { required: 'ZIP code is required' })}
                    />
                  </FormField>

                  <FormField label="Country" required error={locErrors.country}>
                    <input
                      className={inputCls(locErrors.country)}
                      placeholder="Country"
                      {...register(`locations.${idx}.country`, { required: 'Country is required' })}
                    />
                  </FormField>
                </FormGrid>
              </div>
            );
          })}
        </div>
      </FormSection>
    </FormModal>
  );
}
