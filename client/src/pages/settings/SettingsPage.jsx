import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useChangePassword, useMe, useRegister } from '../../hooks/useAuth';
import {
  useDeleteUser,
  useDepartments,
  useLocationCities,
  useResetUserPassword,
  useUpdateUser,
  useUsers,
} from '../../hooks/useMasters';
import { getApiErrorMessage } from '../../lib/queryClient';
import ConfirmModal from '../../components/common/ConfirmModal';
import PageBanner from '../../components/common/PageBanner';
import FormField from '../../components/common/form/FormField';
import FormModal from '../../components/common/form/FormModal';
import Modal from '../../components/common/Modal';
import PasswordInput from '../../components/common/PasswordInput';
import RowActions from '../../components/common/RowActions';
import Skeleton, { SkeletonText } from '../../components/common/Skeleton';
import StaffFields from './StaffFields';
import {
  ASSIGNABLE_ROLES,
  isStaffRole,
  isSuperAdmin,
  roleLabel,
} from '../../constants/roles';

const USER_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_POLICY_LABEL = 'Min 8 chars, with uppercase, lowercase, number, special character';
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

export default function SettingsPage() {
  const { data: user } = useMe();
  const isSuperadmin = isSuperAdmin(user?.role);
  const canManageUsers = isSuperadmin;

  const [showCreate, setShowCreate] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmResetPassword, setConfirmResetPassword] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const { data: users = [], isLoading: loading, refetch: refetchUsers } = useUsers(canManageUsers);
  const { data: locationCities = [] } = useLocationCities(
    canManageUsers && (showCreate || Boolean(editingUser)),
  );
  const { data: departments = [] } = useDepartments({
    includeInactive: true,
    enabled: canManageUsers,
  });
  const registerUser = useRegister();
  const changePassword = useChangePassword();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const resetUserPasswordMutation = useResetUserPassword();

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    control: controlCreate,
    formState: { errors: createErrors, isSubmitting: createSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      userName: '',
      password: '',
      role: '',
      locationCity: '',
      departments: [],
    },
  });
  const createRole = watchCreate('role');

  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    watch: watchPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSubmitting },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
    control: controlEdit,
    formState: { errors: editErrors, isSubmitting: editSubmitting, isDirty: editDirty },
  } = useForm({
    defaultValues: {
      name: '',
      userName: '',
      role: '',
      isActive: true,
      locationCity: '',
      departments: [],
    },
  });
  const editRole = watchEdit('role');

  const onCreateUser = async (data) => {
    try {
      await registerUser.mutateAsync({
        name: data.name,
        userName: data.userName,
        password: data.password,
        role: data.role,
        ...(isStaffRole(data.role)
          ? { locationCity: data.locationCity, departments: data.departments }
          : {}),
      });
      notifications.show({
        message: 'User created',
        color: 'green',
      });
      setShowCreate(false);
      resetCreate();
      refetchUsers();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Failed to create user'),
        color: 'red',
      });
    }
  };

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      notifications.show({ message: 'New passwords do not match', color: 'red' });
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      notifications.show({ message: 'Password updated successfully', color: 'green' });
      resetPwd();
      setShowPasswordModal(false);
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Failed to update password'),
        color: 'red',
      });
    }
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    resetCreate({ name: '', userName: '', password: '', role: '', locationCity: '', departments: [] });
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    resetPwd();
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    resetEdit({
      name: u.name || '',
      userName: u.userName || '',
      role: u.role,
      isActive: u.isActive !== false,
      locationCity: u.locationCity?._id || u.locationCity || '',
      departments: (u.departments ?? []).map((d) => d._id),
    });
  };

  const closeEditUser = () => {
    setEditingUser(null);
    resetEdit({
      name: '',
      userName: '',
      role: '',
      isActive: true,
      locationCity: '',
      departments: [],
    });
  };

  const onUpdateUser = async (data) => {
    if (!editingUser) return;
    if (!editDirty) {
      notifications.show({ message: 'No changes to save', color: 'blue' });
      closeEditUser();
      return;
    }
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser._id,
        data: {
          name: data.name,
          userName: data.userName,
          ...(isSuperAdmin(editingUser.role) ? {} : { role: data.role }),
          isActive: Boolean(data.isActive),
          ...(isStaffRole(data.role)
            ? { locationCity: data.locationCity, departments: data.departments }
            : {}),
        },
      });
      notifications.show({ message: 'User updated', color: 'green' });
      closeEditUser();
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Failed to update user'),
        color: 'red',
      });
    }
  };

  const activeDepartments = useMemo(() => departments.filter((d) => d.isActive), [departments]);

  const editUserDepartmentOptions = useMemo(
    () =>
      departments.filter(
        (d) => d.isActive || editingUser?.departments?.some((own) => own._id === d._id),
      ),
    [departments, editingUser],
  );

  const editUserLocationOptions = useMemo(() => {
    const ownLocation = editingUser?.locationCity;
    const options = [...locationCities];
    if (ownLocation?._id && !options.some((c) => c._id === ownLocation._id)) {
      options.push(ownLocation);
    }
    return options;
  }, [editingUser, locationCities]);

  const canDelete = useMemo(() => {
    if (!confirmDelete) return false;
    if (confirmDelete._id === user?._id) return false;
    if (confirmDelete.role === 'superadmin') return false;
    return true;
  }, [confirmDelete, user?._id]);

  const handleDelete = async () => {
    if (!confirmDelete || !canDelete) return;
    try {
      await deleteUserMutation.mutateAsync(confirmDelete._id);
      notifications.show({ message: 'User deleted', color: 'green' });
      setConfirmDelete(null);
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Failed to delete user'),
        color: 'red',
      });
    }
  };

  const handleResetPassword = async () => {
    if (!confirmResetPassword) return;
    try {
      const password = await resetUserPasswordMutation.mutateAsync(confirmResetPassword._id);
      setConfirmResetPassword(null);
      closeEditUser();
      setGeneratedPassword({ name: confirmResetPassword.name, password });
    } catch (err) {
      notifications.show({
        message: getApiErrorMessage(err, 'Failed to reset password'),
        color: 'red',
      });
    }
  };

  const disabledReason = 'Superadmin accounts cannot be modified here';

  return (
    <div>
      <PageBanner
        className="mb-4"
        title="Settings"
        subtitle={isSuperadmin ? 'User management and account security' : 'Account security'}
        action={[
          { onClick: () => setShowPasswordModal(true), label: 'Change password', icon: 'key' },
          ...(canManageUsers ? [{ onClick: () => setShowCreate(true), label: 'Create User' }] : []),
        ]}
      />

      {!canManageUsers && user && (
        <div className="card overflow-hidden p-6 space-y-4">
          <h2 className="company-form-title">My Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="company-form-field-label">Full Name</label>
              <p className="text-left font-semibold settings-detail-blue">{user.name}</p>
            </div>
            <div>
              <label className="company-form-field-label">Username</label>
              <p className="text-left font-semibold settings-detail-purple">{user.userName}</p>
            </div>
            <div>
              <label className="company-form-field-label">Departments</label>
              <p className="text-left font-semibold settings-detail-blue">
                {user.departments?.map((d) => d.name).join(', ') || '—'}
              </p>
            </div>
            <div>
              <label className="company-form-field-label">Role</label>
              <span className="settings-role-badge">{roleLabel(user.role)}</span>
            </div>
            <div>
              <label className="company-form-field-label">Location</label>
              <p className="text-left font-semibold settings-detail-emerald">
                {user.locationCity?.name || '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {canManageUsers && (
        <>
          <FormModal
            open={showCreate}
            title="Create User"
            subtitle="Create a user account"
            onClose={closeCreateModal}
            onSubmit={handleSubmitCreate(onCreateUser)}
            submitting={createSubmitting}
            submitLabel="Create User"
            submittingLabel="Creating user..."
          >
            <FormField label="Full Name" error={createErrors.name}>
              <input
                className="input-field"
                placeholder="Enter full name"
                {...registerCreate('name', { required: 'Name is required' })}
              />
            </FormField>

            <FormField label="Username" error={createErrors.userName}>
              <input
                className="input-field"
                placeholder="e.g. jdoe"
                autoComplete="username"
                {...registerCreate('userName', {
                  required: 'User name is required',
                  pattern: { value: USER_NAME_PATTERN, message: 'Letters, numbers, ., _ or - only' },
                })}
              />
            </FormField>

            <FormField label="Role" error={createErrors.role}>
              <select
                className="input-field"
                {...registerCreate('role', { required: 'Role is required' })}
              >
                <option value="">Select role</option>
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </FormField>

            {isStaffRole(createRole) && (
              <StaffFields
                register={registerCreate}
                control={controlCreate}
                errors={createErrors}
                cities={locationCities}
                departments={activeDepartments}
              />
            )}

            <FormField label="Password" error={createErrors.password} hint={PASSWORD_POLICY_LABEL}>
              <PasswordInput
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...registerCreate('password', {
                  required: 'Password is required',
                  pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
                })}
              />
            </FormField>
          </FormModal>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="space-y-3">
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="grid grid-cols-[0.4fr,2fr,2fr,1.5fr,1.2fr,1.2fr,1.2fr] gap-3 items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <Skeleton className="h-3 w-6 mx-auto" />
                      <Skeleton className="h-3 w-40" />
                      <SkeletonText lines={1} />
                      <Skeleton className="h-6 w-20 rounded-full mx-auto" />
                      <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                      <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                      <div className="flex justify-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16">
                <p className="company-empty-title">No users found</p>
                <p className="company-empty-desc">Create a user to get started</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th className="text-center">S.No.</th>
                      <th className="text-center">Name</th>
                      <th className="text-center">User Name</th>
                      <th className="text-center">Role</th>
                      <th className="text-center">Location</th>
                      <th className="text-center">Departments</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, index) => {
                      const isTargetSuperadmin = u.role === 'superadmin';
                      const isSelf = u._id === user?._id;
                      const canEdit = isSuperadmin && (isSelf || !isTargetSuperadmin);
                      const deleteDisabled = !isSuperadmin || isTargetSuperadmin || isSelf;
                      return (
                        <tr key={u._id}>
                          <td className="text-center">{index + 1}</td>
                          <td className="settings-user-name">{u.name}</td>
                          <td className="settings-user-email">{u.userName}</td>
                          <td className="text-center">
                            <span className="settings-role-badge">{roleLabel(u.role)}</span>
                          </td>
                          <td className="text-center">{u.locationCity?.name || '—'}</td>
                          <td className="text-center">
                            {u.departments?.length ? (
                              <div className="flex flex-wrap justify-center gap-1">
                                {u.departments.map((d) => (
                                  <span key={d._id} className="settings-role-badge whitespace-nowrap">
                                    {d.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="text-center">
                            <span
                              className={
                                u.isActive ? 'company-status-active' : 'company-status-inactive'
                              }
                            >
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-center">
                            <RowActions
                              onEdit={() => openEditUser(u)}
                              onDelete={() =>
                                setConfirmDelete({ _id: u._id, name: u.name, role: u.role })
                              }
                              editProps={{
                                disabled: !canEdit,
                                title: canEdit ? 'Edit user' : disabledReason,
                                ariaLabel: canEdit ? `Edit ${u.name}` : undefined,
                              }}
                              deleteProps={{
                                disabled: deleteDisabled,
                                title: deleteDisabled ? disabledReason : 'Delete',
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ConfirmModal
            open={!!confirmDelete}
            title="Delete User"
            message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
          />

          <ConfirmModal
            open={!!confirmResetPassword}
            title="Reset Password"
            message={`Generate a new password for "${confirmResetPassword?.name}"? Their current password will stop working and any active sessions will be signed out.`}
            confirmLabel="Reset Password"
            variant="warning"
            loading={resetUserPasswordMutation.isPending}
            onConfirm={handleResetPassword}
            onCancel={() => setConfirmResetPassword(null)}
          />

          <FormModal
            open={Boolean(editingUser)}
            title="Edit user"
            subtitle="Update name, user name, role, or account status"
            onClose={closeEditUser}
            onSubmit={handleSubmitEdit(onUpdateUser)}
            submitting={editSubmitting}
            submitLabel="Save changes"
            submittingLabel="Saving…"
          >
            <FormField label="Full name" error={editErrors.name}>
              <input
                className="input-field"
                {...registerEdit('name', { required: 'Name is required' })}
              />
            </FormField>

            <FormField label="Username" error={editErrors.userName}>
              <input
                type="text"
                className="input-field"
                autoComplete="off"
                {...registerEdit('userName', {
                  required: 'User name is required',
                  pattern: { value: USER_NAME_PATTERN, message: 'Letters, numbers, ., _ or - only' },
                })}
              />
            </FormField>

            {!isSuperAdmin(editingUser?.role) && (
              <FormField label="Role" error={editErrors.role}>
                <select
                  className="input-field"
                  {...registerEdit('role', { required: 'Role is required' })}
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {isStaffRole(editRole) && (
              <StaffFields
                register={registerEdit}
                control={controlEdit}
                errors={editErrors}
                cities={editUserLocationOptions}
                departments={editUserDepartmentOptions}
              />
            )}

            <FormField
              label="Status"
              hint={
                editingUser?._id === user?._id
                  ? 'You cannot deactivate your own account.'
                  : 'Inactive users cannot sign in.'
              }
            >
              <Controller
                name="isActive"
                control={controlEdit}
                render={({ field }) => (
                  <select
                    className="input-field"
                    value={field.value ? 'true' : 'false'}
                    onChange={(e) => field.onChange(e.target.value === 'true')}
                    disabled={editSubmitting || editingUser?._id === user?._id}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                )}
              />
            </FormField>

            {!isSuperAdmin(editingUser?.role) && editingUser?._id !== user?._id && (
              <div className="col-span-full pt-4 company-form-divider flex items-center justify-between gap-3">
                <div>
                  <label className="company-form-field-label">Password</label>
                  <p className="company-form-section-hint">Forgot their password?</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 transition-colors shrink-0"
                  onClick={() =>
                    setConfirmResetPassword({
                      _id: editingUser._id,
                      name: editingUser.name,
                    })
                  }
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 11-12 0 6 6 0 0112 0zM7 15l-4 4m0 0v-3m0 3h3"
                    />
                  </svg>
                  Reset password
                </button>
              </div>
            )}
          </FormModal>
        </>
      )}

      <FormModal
        open={showPasswordModal}
        title="Change password"
        subtitle="Enter your current password, then choose a new one (min. 6 characters)."
        onClose={closePasswordModal}
        onSubmit={handleSubmitPwd(onChangePassword)}
        submitting={pwdSubmitting}
        submitLabel="Update password"
        submittingLabel="Updating…"
      >
        <FormField label="Current password" error={pwdErrors.currentPassword}>
          <PasswordInput
            autoComplete="current-password"
            {...registerPwd('currentPassword', { required: 'Current password is required' })}
          />
        </FormField>

        <FormField label="New password" error={pwdErrors.newPassword}>
          <PasswordInput
            autoComplete="new-password"
            {...registerPwd('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Minimum 6 characters' },
            })}
          />
        </FormField>

        <FormField label="Confirm new password" error={pwdErrors.confirmPassword}>
          <PasswordInput
            autoComplete="new-password"
            {...registerPwd('confirmPassword', {
              required: 'Please confirm your new password',
              validate: (val) => val === watchPwd('newPassword') || 'Does not match new password',
            })}
          />
        </FormField>
      </FormModal>

      <Modal
        open={Boolean(generatedPassword)}
        title="New Password Generated"
        subtitle={`Share this with ${generatedPassword?.name} securely. It will not be shown again.`}
        onClose={() => setGeneratedPassword(null)}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <code className="input-field font-mono text-sm flex-1 select-all">
              {generatedPassword?.password}
            </code>
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(generatedPassword.password);
                  notifications.show({ message: 'Password copied', color: 'green' });
                } catch {
                  notifications.show({ message: 'Could not copy password', color: 'red' });
                }
              }}
            >
              Copy
            </button>
          </div>
          <div className="company-form-footer">
            <button type="button" className="btn-primary" onClick={() => setGeneratedPassword(null)}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
