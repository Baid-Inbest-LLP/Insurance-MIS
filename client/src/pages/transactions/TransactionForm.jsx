import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useMe } from '../../hooks/useAuth';
import {
  useCreateDraft,
  useCreateTransaction,
  useDeleteDraft,
  useExtractPolicy,
  useTransactionOptions,
  useUpdateDraft,
  useUpdateTransaction,
} from '../../hooks/useTransactions';
import { AGENT_SOURCE, COMMISSION_STATUSES, FREQUENCIES, KIND_LABELS, SOURCES, TRANSACTION_KINDS } from '../../constants/transactions';
import { canManageCommission } from '../../lib/commission';
import { getApiErrorMessage } from '../../lib/queryClient';
import { ageOn, displayDate, maturityDate } from '../../lib/policyDates';
import {
  buildTransactionPayload,
  draftDataFromValues,
  emptyTransactionValues,
  valuesFromDraft,
  valuesFromExtraction,
  valuesFromTransaction,
} from '../../lib/transactionForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import DateField from '../../components/common/form/DateField';
import FormField from '../../components/common/form/FormField';
import FormGrid from '../../components/common/form/FormGrid';
import FormModal from '../../components/common/form/FormModal';
import FormSection from '../../components/common/form/FormSection';
import PolicyUpload from './PolicyUpload';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const AMOUNT_RULES = {
  min: { value: 0, message: 'Cannot be negative' },
  validate: (value) => value === '' || Number(Number(value).toFixed(2)) === Number(value) || 'At most 2 decimal places',
};
const sum = (...values) => values.reduce((total, value) => total + (Number(value) || 0), 0).toFixed(2);
const READ_ONLY_CLASS = 'input-field bg-gray-50 text-gray-500 cursor-default';
// The dropdowns whose options load after the form opens.
const SELECT_FIELDS = ['department', 'branch', 'insurer', 'businessType', 'lob'];

// A dropdown of one master list; keeps the saved value visible even if that item is now inactive.
function MasterSelect({ label, name, register, error, items = [], current, disabled = false }) {
  const options = current && !items.some((item) => item._id === current._id) ? [...items, current] : items;

  return (
    <FormField label={label} required error={error}>
      <select
        className="input-field"
        disabled={disabled}
        {...register(name, { required: `${label} is required` })}
      >
        <option value="">{disabled ? 'Select insurance type first' : `Select ${label.toLowerCase()}`}</option>
        {options.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function TextField({ label, name, register, errors, required = false, rules, ...props }) {
  return (
    <FormField label={label} required={required} error={errors[name]}>
      <input
        className="input-field"
        {...props}
        {...register(name, { required: required && `${label} is required`, ...rules })}
      />
    </FormField>
  );
}

// A commission percentage, typed in by hand.
function PercentField({ label, name, register, errors }) {
  return (
    <FormField label={label} error={errors[name]}>
      <input
        type="number"
        step="0.01"
        min="0"
        max="100"
        className="input-field"
        {...register(name, { ...AMOUNT_RULES, max: { value: 100, message: 'Cannot be more than 100' } })}
      />
    </FormField>
  );
}

// A read-only amount is calculated by the form, but it is still submitted with the other fields.
function AmountField({ label, name, register, errors, readOnly = false, required = true }) {
  return (
    <FormField label={label} required={required} error={errors[name]}>
      <input
        type="number"
        step="0.01"
        min="0"
        className={readOnly ? READ_ONLY_CLASS : 'input-field'}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        {...register(name, { required: required && `${label} is required`, ...AMOUNT_RULES })}
      />
    </FormField>
  );
}

// Opens empty, with a saved transaction to edit, or with a saved draft to finish.
export default function TransactionForm({ transaction, draft, onClose }) {
  const isEdit = Boolean(transaction);
  const { data: user } = useMe();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const extractPolicy = useExtractPolicy();
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const deleteDraft = useDeleteDraft();

  const [initialValues] = useState(() =>
    transaction ? valuesFromTransaction(transaction) : draft ? valuesFromDraft(draft) : emptyTransactionValues(),
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialValues,
  });

  const values = useWatch({ control });
  const department = values.department;
  const { data: options, isPlaceholderData } = useTransactionOptions(department);
  const departments = options?.departments ?? [];
  const loadedBranches = options?.branches ?? [];
  // The saved branch is listed right away, so it is selected before the branch list has loaded.
  const branches =
    transaction && !loadedBranches.some((item) => item._id === transaction.branch._id)
      ? [...loadedBranches, transaction.branch]
      : loadedBranches;
  // Master items of the previous department are not shown while the new ones load.
  const masters = (!isPlaceholderData && options?.masters) || {};
  // The Type field is the department; it is fixed when editing or when the user has one department.
  const departmentFixed = isEdit || departments.length === 1;
  const selectedDepartment = departments.find((item) => item._id === department);
  // The department code (GI or LI) is the transaction type.
  const kind = isEdit ? transaction.kind : selectedDepartment?.code.toLowerCase();
  const isGi = kind === TRANSACTION_KINDS.GI;
  const sharedProps = { register, errors };
  const noDepartment = !department;

  // Closing a new or resumed form that has typed input asks to save it; calculated totals are ignored.
  const [askClose, setAskClose] = useState(false);
  const typed = (formValues) => {
    const data = draftDataFromValues(formValues);
    delete data.premium;
    if (isGi) delete data.netPremium;
    return JSON.stringify(Object.entries(data).sort());
  };
  const requestClose = () =>
    !isEdit && typed(getValues()) !== typed(initialValues) ? setAskClose(true) : onClose();

  // GI: net premium = OD + third-party + stamp duty. Both kinds: premium = net premium + GST.
  const netPremium = isGi ? sum(values.odPremium, values.thirdPartyCover, values.agentStampDuty) : values.netPremium;
  const premium = sum(netPremium, values.gst);
  useEffect(() => {
    if (isGi) setValue('netPremium', netPremium);
    setValue('premium', premium);
  }, [isGi, netPremium, premium, setValue]);

  // Commission is typed in by hand; only people who can manage it see these fields.
  const showCommission = Boolean(kind) && canManageCommission(user, transaction);

  const onlyDepartmentId = !isEdit && departments.length === 1 ? departments[0]._id : '';
  useEffect(() => {
    if (onlyDepartmentId) setValue('department', onlyDepartmentId);
  }, [onlyDepartmentId, setValue]);

  const resetMasters = () => {
    for (const name of ['insurer', 'businessType', 'lob']) setValue(name, '');
  };

  // A draft's dropdown choices can only be applied once their lists are loaded.
  const selectionsRestored = useRef(false);
  useEffect(() => {
    if (!draft || selectionsRestored.current || isPlaceholderData || !options || department !== draft.department) return;
    selectionsRestored.current = true;
    for (const name of SELECT_FIELDS) if (initialValues[name]) setValue(name, initialValues[name]);
  }, [draft, initialValues, options, isPlaceholderData, department, setValue]);

  const savingDraft = createDraft.isPending || updateDraft.isPending;
  const saveDraft = async () => {
    if (!kind) {
      setAskClose(false);
      notifications.show({ message: 'Select the insurance type first', color: 'red' });
      return;
    }
    const payload = { kind, department, data: draftDataFromValues(getValues()) };
    try {
      if (draft) await updateDraft.mutateAsync({ id: draft._id, data: payload });
      else await createDraft.mutateAsync(payload);
      notifications.show({ message: 'Policy saved as draft', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({ message: getApiErrorMessage(err, 'Failed to save draft'), color: 'red' });
    }
  };

  // Fills the form from the AI's result; fields it did not find keep their value.
  const applyExtraction = (fields) => {
    const found = valuesFromExtraction(fields);
    for (const [name, value] of Object.entries(found)) setValue(name, value, { shouldDirty: true, shouldValidate: true });
    notifications.show({
      message: `Filled ${Object.keys(found).length} of ${Object.keys(fields).length} fields from the policy. Please check them before saving.`,
      color: 'blue',
    });
  };

  // The modal's `busy` locks the form while the policy is read.
  const readPolicy = async (file) => {
    try {
      const { fields } = await extractPolicy.mutateAsync({ department, kind, file });
      applyExtraction(fields);
    } catch (err) {
      notifications.show({ message: getApiErrorMessage(err, 'Could not read the policy PDF'), color: 'red' });
    }
  };

  const onSubmit = async (data) => {
    const options = { withCommission: showCommission };
    const payload = buildTransactionPayload({ ...data, kind, department }, options);
    // The form's own dirty flag is not used: calculated fields are set by code and would count as changes.
    if (isEdit) {
      const saved = buildTransactionPayload({ ...valuesFromTransaction(transaction), kind, department }, options);
      if (JSON.stringify(saved) === JSON.stringify(payload)) {
        notifications.show({ message: 'No changes to save', color: 'blue' });
        onClose();
        return;
      }
    }
    try {
      if (isEdit) await updateTransaction.mutateAsync({ id: transaction._id, data: payload });
      else {
        await createTransaction.mutateAsync(payload);
        if (draft) deleteDraft.mutate(draft._id); // the draft is now a real transaction
      }
      notifications.show({ message: isEdit ? 'Policy updated' : 'Policy added', color: 'green' });
      onClose();
    } catch (err) {
      for (const { field, message } of err.response?.data?.errors ?? []) setError(field, { message });
      notifications.show({ message: getApiErrorMessage(err, 'Failed to save policy'), color: 'red' });
    }
  };

  return (
    <>
      <FormModal
        open
        size="xl"
        title={isEdit ? 'Edit Policy' : 'Add Policy'}
        subtitle={isEdit ? `${KIND_LABELS[transaction.kind]} · ${transaction.department.name}` : 'Enter the policy details'}
        onClose={requestClose}
        onSubmit={handleSubmit(onSubmit)}
        submitting={isSubmitting}
        busy={extractPolicy.isPending}
        busyLabel="Reading policy. This can take up to a minute..."
        footerStart={
          isEdit ? undefined : (
            <button type="button" className="btn-secondary" onClick={saveDraft} disabled={savingDraft || isSubmitting}>
              {savingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
          )
        }
        submitLabel={isEdit ? 'Save changes' : 'Add Policy'}
      >
        <FormSection
          title="Policy"
          action={
            isEdit ? undefined : (
              <PolicyUpload
                disabled={!kind || isPlaceholderData}
                hint={noDepartment ? 'Select the insurance type first' : undefined}
                onFile={readPolicy}
              />
            )
          }
        >
          <FormGrid columns={3}>
            <FormField label="Type" required>
              {departmentFixed ? (
                <input
                  className="input-field"
                  value={selectedDepartment?.name ?? transaction?.department.name ?? ''}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  className="input-field"
                  {...register('department', { required: 'Department is required', onChange: resetMasters })}
                >
                  <option value="">Select Insurance Type</option>
                  {departments.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <TextField label="Policy No." name="policyNo" required maxLength={60} {...sharedProps} />
            <DateField label="Policy Date" name="policyDate" control={control} required />
            <DateField label="Date of Entry" name="entryDate" control={control} />
            <TextField label="Client Name" name="clientName" required maxLength={120} {...sharedProps} />

            <FormField label="Branch" required error={errors.branch}>
              <select className="input-field" {...register('branch', { required: 'Branch is required' })}>
                <option value="">Select branch</option>
                {branches.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.code}
                  </option>
                ))}
              </select>
            </FormField>
            <MasterSelect label="Insurer" name="insurer" items={masters.insurer} error={errors.insurer} current={transaction?.insurer} disabled={noDepartment} register={register} />
            <TextField label="Insurer Address" name="insurerAddress" required maxLength={250} {...sharedProps} />
            <TextField label="Office Code" name="officeCode" maxLength={30} {...sharedProps} />

            <MasterSelect label="Business Type" name="businessType" items={masters.businessType} error={errors.businessType} current={transaction?.businessType} disabled={noDepartment} register={register} />
            <MasterSelect label="Line of Business" name="lob" items={masters.lob} error={errors.lob} current={transaction?.lob} disabled={noDepartment} register={register} />
            <TextField label="Product Type" name="productType" maxLength={100} {...sharedProps} />
            <FormField label="Source" required error={errors.source}>
              <select className="input-field" {...register('source', { required: 'Source is required' })}>
                <option value="">Select source</option>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </FormField>
            {values.source === AGENT_SOURCE && (
              <TextField label="Agent" name="agent" required maxLength={100} {...sharedProps} />
            )}
            <TextField label="Reference" name="reference" maxLength={200} {...sharedProps} />
          </FormGrid>
        </FormSection>

        {kind && (isGi ? (
          <FormSection title="Vehicle & Cover">
            <FormGrid columns={3}>
              <TextField
                label="Client GST"
                name="clientGst"
                {...sharedProps}
                rules={{ setValueAs: (v) => v.trim().toUpperCase(), pattern: { value: GST_REGEX, message: 'Not a valid GST number' } }}
              />
              <TextField label="Vehicle No." name="vehicleNo" maxLength={20} {...sharedProps} />
              <DateField label="MFG Date" name="mfgDate" control={control} />
              <TextField label="Maker" name="maker" maxLength={60} {...sharedProps} />
              <TextField label="Model" name="model" maxLength={60} {...sharedProps} />
              <TextField
                label="NCB (%)"
                name="ncb"
                type="number"
                step="any"
                {...sharedProps}
                rules={{ min: { value: 0, message: 'Cannot be negative' }, max: { value: 100, message: 'Cannot be more than 100' } }}
              />
              <DateField label="Policy Period From" name="policyPeriodFrom" control={control} required />
              <DateField label="Policy Period To" name="policyPeriodTo" control={control} required minDate={values.policyPeriodFrom} />
            </FormGrid>
          </FormSection>
        ) : (
          <FormSection title="Life Policy">
            <FormGrid columns={3}>
              <DateField label="Date of Birth" name="dateOfBirth" control={control} required maxDate={new Date()} />
              <DateField label="Date of Commencement" name="commencementDate" control={control} required minDate={values.dateOfBirth} />
              <FormField label="Age">
                <input className="input-field" value={ageOn(values.dateOfBirth, values.commencementDate)} readOnly disabled />
              </FormField>
              <TextField label="Payment Term (Y)" name="paymentTermYears" type="number" min="1" step="1" required {...sharedProps} />
              <TextField label="Policy Term (Y)" name="policyTermYears" type="number" min="1" step="1" required {...sharedProps} />
              <FormField label="Maturity Date">
                <input className="input-field" value={displayDate(maturityDate(values.commencementDate, values.policyTermYears))} readOnly disabled />
              </FormField>
              <FormField label="Frequency" required error={errors.frequency}>
                <select className="input-field" {...register('frequency', { required: 'Frequency is required' })}>
                  <option value="">Select frequency</option>
                  {FREQUENCIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <DateField label="Next Due Date" name="nextDueDate" control={control} />
              <DateField label="Actual Payment Date" name="actualPaymentDate" control={control} required />
            </FormGrid>
          </FormSection>
        ))}

        <FormSection title="Premium">
          <FormGrid columns={3}>
            {kind && (isGi ? (
              <>
                <AmountField label="OD Premium" name="odPremium" {...sharedProps} />
                <AmountField label="Third-party Cover" name="thirdPartyCover" {...sharedProps} />
                <AmountField label="Agent Stamp Duty" name="agentStampDuty" required={false} {...sharedProps} />
              </>
            ) : (
              <>
                <AmountField label="Premium Per Month" name="premiumPerMonth" {...sharedProps} />
                <AmountField label="Sum Assured" name="sumAssured" {...sharedProps} />
                <div className="hidden sm:block" />
              </>
            ))}
            <AmountField label="Net Premium" name="netPremium" readOnly={isGi} {...sharedProps} />
            <AmountField label="GST" name="gst" {...sharedProps} />
            <AmountField label="Premium" name="premium" readOnly {...sharedProps} />
          </FormGrid>
        </FormSection>

        {showCommission && (
          <FormSection title="Commission">
            <FormGrid columns={3}>
              {isGi ? (
                <>
                  <AmountField label="OD Commission" name="odCommission" required={false} {...sharedProps} />
                  <AmountField label="TP Commission" name="tpCommission" required={false} {...sharedProps} />
                  <AmountField label="Total Commission" name="totalCommission" required={false} {...sharedProps} />
                  <PercentField label="OD Commission (%)" name="odCommissionPercent" {...sharedProps} />
                  <PercentField label="TP Commission (%)" name="tpCommissionPercent" {...sharedProps} />
                  <PercentField label="Total Commission (%)" name="totalCommissionPercent" {...sharedProps} />
                </>
              ) : (
                <>
                  <AmountField label="Commission" name="commissionAmount" required={false} {...sharedProps} />
                  <PercentField label="Commission (%)" name="commissionPercent" {...sharedProps} />
                </>
              )}
              <FormField label="Commission Status">
                <select
                  className={`input-field ${COMMISSION_STATUSES.find((item) => item.value === values.commissionStatus)?.className ?? ''}`}
                  {...register('commissionStatus')}
                >
                  {COMMISSION_STATUSES.map((item) => (
                    <option key={item.value} value={item.value} className={item.className}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormGrid>
          </FormSection>
        )}
      </FormModal>
      <ConfirmModal
        open={askClose}
        title="Save as draft?"
        message="You have unsaved changes. Save them as a draft to finish later, or discard them."
        variant="primary"
        confirmLabel="Save as Draft"
        secondaryLabel="Discard"
        cancelLabel="Keep editing"
        loading={savingDraft}
        onConfirm={saveDraft}
        onSecondary={onClose}
        onCancel={() => setAskClose(false)}
      />
    </>
  );
}
