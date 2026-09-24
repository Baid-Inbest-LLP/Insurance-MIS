import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useChangePassword, useMe, useRegister } from '../../hooks/useAuth';
import {
  useDeleteUser,
  useLocationCities,
  useResetUserPassword,
  useUpdateUser,
  useUsers,
} from '../../hooks/useMasters';
import { getApiErrorMessage } from '../../lib/queryClient';
import ConfirmModal from '../../components/common/ConfirmModal';
import PageBanner from '../../components/common/PageBanner';
import PasswordInput from '../../components/common/PasswordInput';
import RowActions from '../../components/common/RowActions';
import Skeleton, { SkeletonText } from '../../components/common/Skeleton';
import { isSuperAdmin } from '../../constants/roles';

const USER_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_POLICY_LABEL = 'Min 8 chars, with uppercase, lowercase, number, special character';
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

const roleLabel = (role) => {
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'accountant') return 'Accountant';
  return role || '';
};

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
  const registerUser = useRegister();
  const changePassword = useChangePassword();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const resetUserPasswordMutation = useResetUserPassword();

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: createSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      userName: '',
      password: '',
      locationCity: '',
    },
  });

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
    control: controlEdit,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm({
    defaultValues: { name: '', userName: '', isActive: true, locationCity: '' },
  });

  const onCreateUser = async (data) => {
    try {
      await registerUser.mutateAsync({
        name: data.name,
        userName: data.userName,
        password: data.password,
        role: 'accountant',
        locationCity: data.locationCity,
      });
      notifications.show({
        message: 'Accountant account created',
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
    resetCreate({ name: '', userName: '', password: '', locationCity: '' });
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
      isActive: u.isActive !== false,
      locationCity: u.locationCity?._id || u.locationCity || '',
    });
  };

  const closeEditUser = () => {
    setEditingUser(null);
    resetEdit({ name: '', userName: '', isActive: true, locationCity: '' });
  };

  const onUpdateUser = async (data) => {
    if (!editingUser) return;
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser._id,
        data: {
          name: data.name,
          userName: data.userName,
          isActive: Boolean(data.isActive),
          ...(editingUser.role === 'accountant' ? { locationCity: data.locationCity } : {}),
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="company-form-field-label">Full Name</label>
              <p className="text-left font-semibold settings-detail-blue">{user.name}</p>
            </div>
            <div>
              <label className="company-form-field-label">Username</label>
              <p className="text-left font-semibold settings-detail-purple">{user.userName}</p>
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
          {showCreate && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={createSubmitting ? undefined : closeCreateModal}
            >
              <div
                className="company-form-panel max-w-lg"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-user-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="company-form-header">
                  <div>
                    <h2 id="create-user-title" className="company-form-title">Create User</h2>
                    <p className="company-form-subtitle">Create an accountant account</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="company-form-close-btn"
                    aria-label="Close create user modal"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmitCreate(onCreateUser)} className="p-6 space-y-4">
                  <div>
                    <label className="company-form-field-label">Full Name</label>
                    <input
                      className="input-field"
                      placeholder="Enter full name"
                      {...registerCreate('name', { required: 'Name is required' })}
                    />
                    {createErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{createErrors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="company-form-field-label">Username</label>
                    <input
                      className="input-field"
                      placeholder="e.g. jdoe"
                      autoComplete="username"
                      {...registerCreate('userName', {
                        required: 'User name is required',
                        pattern: { value: USER_NAME_PATTERN, message: 'Letters, numbers, ., _ or - only' },
                      })}
                    />
                    {createErrors.userName && (
                      <p className="text-red-500 text-xs mt-1">{createErrors.userName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="company-form-field-label">Role</label>
                    <input className="settings-readonly-role" value="Accountant" readOnly />
                  </div>

                  <div>
                    <label className="company-form-field-label">Location</label>
                    <select
                      className="input-field"
                      {...registerCreate('locationCity', { required: 'Location is required' })}
                    >
                      <option value="">Select location</option>
                      {locationCities.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {createErrors.locationCity && (
                      <p className="text-red-500 text-xs mt-1">{createErrors.locationCity.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="company-form-field-label">Password</label>
                    <PasswordInput
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      {...registerCreate('password', {
                        required: 'Password is required',
                        pattern: { value: STRONG_PASSWORD_PATTERN, message: PASSWORD_POLICY_LABEL },
                      })}
                    />
                    {createErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{createErrors.password.message}</p>
                    )}
                    <p className="company-form-section-hint mt-1">{PASSWORD_POLICY_LABEL}</p>
                  </div>

                  <div className="company-form-footer">
                    <button type="button" onClick={closeCreateModal} className="btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" disabled={createSubmitting} className="btn-primary">
                      {createSubmitting ? 'Creating user...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                <table>
                  <thead>
                    <tr>
                      <th className="text-center">S.No.</th>
                      <th className="text-left">Name</th>
                      <th className="text-center">User Name</th>
                      <th className="text-center">Role</th>
                      <th className="text-center">Location</th>
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

          {editingUser && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={editSubmitting ? undefined : closeEditUser}
            >
              <div
                className="company-form-panel max-w-lg border border-gray-100"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-user-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="company-form-header">
                  <div>
                    <h2 id="edit-user-title" className="company-form-title">
                      Edit user
                    </h2>
                    <p className="company-form-subtitle">Update name, user name, or account status</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditUser}
                    disabled={editSubmitting}
                    className="company-form-close-btn"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmitEdit(onUpdateUser)} className="p-6 space-y-4">
                  <div>
                    <label className="company-form-field-label">Full name</label>
                    <input
                      className="input-field"
                      {...registerEdit('name', { required: 'Name is required' })}
                    />
                    {editErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{editErrors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="company-form-field-label">Username</label>
                    <input
                      type="text"
                      className="input-field"
                      autoComplete="off"
                      {...registerEdit('userName', {
                        required: 'User name is required',
                        pattern: { value: USER_NAME_PATTERN, message: 'Letters, numbers, ., _ or - only' },
                      })}
                    />
                    {editErrors.userName && (
                      <p className="text-red-500 text-xs mt-1">{editErrors.userName.message}</p>
                    )}
                  </div>
                  {editingUser?.role === 'accountant' && (
                    <div>
                      <label className="company-form-field-label">Location</label>
                      <select
                        className="input-field"
                        {...registerEdit('locationCity', { required: 'Location is required' })}
                      >
                        <option value="">Select location</option>
                        {editUserLocationOptions.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {editErrors.locationCity && (
                        <p className="text-red-500 text-xs mt-1">{editErrors.locationCity.message}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="company-form-field-label">Status</label>
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
                    <p className="company-form-section-hint mt-1">
                      {editingUser?._id === user?._id
                        ? 'You cannot deactivate your own account.'
                        : 'Inactive users cannot sign in.'}
                    </p>
                  </div>
                  {editingUser?.role !== 'superadmin' && editingUser?._id !== user?._id && (
                    <div className="mt-4 pt-4 company-form-divider flex items-center justify-between gap-3">
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
                  <div className="company-form-footer">
                    <button
                      type="button"
                      onClick={closeEditUser}
                      disabled={editSubmitting}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={editSubmitting} className="btn-primary">
                      {editSubmitting ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={pwdSubmitting ? undefined : closePasswordModal}
        >
          <div
            className="company-form-panel max-w-lg border border-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="company-form-header">
              <div>
                <h2 id="change-password-title" className="company-form-title">
                  Change password
                </h2>
                <p className="company-form-subtitle">
                  Enter your current password, then choose a new one (min. 6 characters).
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={pwdSubmitting}
                className="company-form-close-btn"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitPwd(onChangePassword)} className="p-6 space-y-4">
              <div>
                <label className="company-form-field-label">Current password</label>
                <PasswordInput
                  autoComplete="current-password"
                  {...registerPwd('currentPassword', { required: 'Current password is required' })}
                />
                {pwdErrors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">{pwdErrors.currentPassword.message}</p>
                )}
              </div>
              <div>
                <label className="company-form-field-label">New password</label>
                <PasswordInput
                  autoComplete="new-password"
                  {...registerPwd('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  })}
                />
                {pwdErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{pwdErrors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label className="company-form-field-label">Confirm new password</label>
                <PasswordInput
                  autoComplete="new-password"
                  {...registerPwd('confirmPassword', {
                    required: 'Please confirm your new password',
                    validate: (val) =>
                      val === watchPwd('newPassword') || 'Does not match new password',
                  })}
                />
                {pwdErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{pwdErrors.confirmPassword.message}</p>
                )}
              </div>
              <div className="company-form-footer">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={pwdSubmitting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={pwdSubmitting} className="btn-primary">
                  {pwdSubmitting ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setGeneratedPassword(null)}
        >
          <div
            className="company-form-panel max-w-lg border border-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generated-password-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="company-form-header">
              <div>
                <h2 id="generated-password-title" className="company-form-title">
                  New Password Generated
                </h2>
                <p className="company-form-subtitle">
                  Share this with {generatedPassword.name} securely. It will not be shown again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedPassword(null)}
                className="company-form-close-btn"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <code className="input-field font-mono text-sm flex-1 select-all">
                  {generatedPassword.password}
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
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setGeneratedPassword(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
