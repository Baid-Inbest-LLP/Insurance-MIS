import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { notifications } from "@mantine/notifications";
import { useIsSuperAdmin } from "../../hooks/useAuth";
import {
	useCreateMasterItem,
	useDeleteMasterItem,
	useDepartments,
	useMasterItems,
	useUpdateMasterItem,
} from "../../hooks/useMasters";
import { getApiErrorMessage } from "../../lib/queryClient";
import ControlCenterToolbar from "./ControlCenterToolbar";
import ConfirmModal from "../../components/common/ConfirmModal";
import RowActions from "../../components/common/RowActions";
import FormField from "../../components/common/form/FormField";
import FormModal from "../../components/common/form/FormModal";
import Skeleton from "../../components/common/Skeleton";

const EMPTY_FORM = { name: "", departmentId: "", isActive: true };

// One master list (e.g. insurers) for the selected department, managed through the master-value API.
export default function CatalogListPage({ slug, title }) {
	const canManage = useIsSuperAdmin();
	const [search, setSearch] = useState("");
	const [pickedDepartmentId, setPickedDepartmentId] = useState("");
	// "new" while adding, the item being edited, or null when the modal is closed.
	const [editing, setEditing] = useState(null);
	const [confirmDelete, setConfirmDelete] = useState(null);
	const isNew = editing === "new";

	const { data: departments = [], isLoading: departmentsLoading } =
		useDepartments({ includeInactive: canManage });
	const departmentId = pickedDepartmentId || departments[0]?._id || "";
	const department = departments.find((d) => d._id === departmentId);
	const activeDepartments = departments.filter((d) => d.isActive);

	const { data: items = [], isLoading: itemsLoading } = useMasterItems(
		departmentId,
		slug,
		{ activeOnly: false },
	);
	const loading = departmentsLoading || (Boolean(departmentId) && itemsLoading);

	const createItem = useCreateMasterItem();
	const updateItem = useUpdateMasterItem();
	const deleteItem = useDeleteMasterItem();
	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors, isSubmitting, isDirty },
	} = useForm({ defaultValues: EMPTY_FORM });

	const term = search.trim().toLowerCase();
	const visibleItems = items.filter((item) =>
		item.name.toLowerCase().includes(term),
	);

	const openModal = (item) => {
		setEditing(item);
		reset(
			item === "new"
				? EMPTY_FORM
				: { name: item.name, departmentId: "", isActive: item.isActive },
		);
	};

	const closeModal = () => {
		setEditing(null);
		reset(EMPTY_FORM);
	};

	const onSubmit = async (data) => {
		if (!isNew && !isDirty) {
			notifications.show({ message: "No changes to save", color: "blue" });
			closeModal();
			return;
		}
		try {
			if (isNew) {
				await createItem.mutateAsync({
					departmentId: data.departmentId,
					slug,
					data: { name: data.name },
				});
				setPickedDepartmentId(data.departmentId);
			} else {
				await updateItem.mutateAsync({
					departmentId,
					slug,
					itemId: editing._id,
					data: { name: data.name, isActive: Boolean(data.isActive) },
				});
			}
			notifications.show({
				message: isNew ? `${title} added` : `${title} updated`,
				color: "green",
			});
			closeModal();
		} catch (err) {
			notifications.show({
				message: getApiErrorMessage(err, `Failed to save ${title}`),
				color: "red",
			});
		}
	};

	const handleDelete = () => {
		if (!confirmDelete) return;
		deleteItem.mutate(
			{ departmentId, slug, itemId: confirmDelete._id },
			{
				onSuccess: () =>
					notifications.show({ message: `${title} deleted`, color: "green" }),
				onError: (err) =>
					notifications.show({
						message: getApiErrorMessage(err, "Delete failed"),
						color: "red",
					}),
				onSettled: () => setConfirmDelete(null),
			},
		);
	};

	return (
		<div>
			<ControlCenterToolbar
				title={title}
				subtitle={`${department?.name ?? "Select a department"} · ${items.length} item${items.length !== 1 ? "s" : ""}`}
				search={search}
				onSearchChange={setSearch}
				searchPlaceholder={`Search ${title.toLowerCase()}...`}
				filters={
					<select
						className="input-field w-full sm:w-56"
						value={departmentId}
						onChange={(e) => setPickedDepartmentId(e.target.value)}
						aria-label="Department"
					>
						{departments.map((d) => (
							<option key={d._id} value={d._id}>
								{d.isActive ? d.name : `${d.name} (inactive)`}
							</option>
						))}
					</select>
				}
				showAction={canManage && activeDepartments.length > 0}
				actionLabel={`Add ${title}`}
				onAction={() => openModal("new")}
			/>

			<div className="card overflow-hidden">
				{loading ? (
					<div className="p-6 space-y-3">
						{[0, 1, 2].map((row) => (
							<Skeleton key={row} className="h-4 w-full" />
						))}
					</div>
				) : departments.length === 0 ? (
					<div className="text-center py-16">
						<p className="company-empty-title">No departments yet</p>
						<p className="company-empty-desc">
							Add a department in the Departments tab first
						</p>
					</div>
				) : visibleItems.length === 0 ? (
					<div className="text-center py-16">
						<p className="company-empty-title">
							{items.length === 0
								? `No ${title.toLowerCase()} yet`
								: `No ${title.toLowerCase()} match your search`}
						</p>
					</div>
				) : (
					<div className="table-wrapper">
						<table style={{ tableLayout: "auto" }}>
							<thead>
								<tr>
									<th className="text-center">S.No.</th>
									<th className="text-center">Name</th>
									<th className="text-center">Status</th>
									{canManage && <th className="text-center">Actions</th>}
								</tr>
							</thead>
							<tbody>
								{visibleItems.map((item, index) => (
									<tr key={item._id}>
										<td className="text-center">{index + 1}</td>
										<td className="settings-user-name">{item.name}</td>
										<td className="text-center">
											<span
												className={
													item.isActive
														? "company-status-active"
														: "company-status-inactive"
												}
											>
												{item.isActive ? "Active" : "Inactive"}
											</span>
										</td>
										{canManage && (
											<td className="text-center">
												<RowActions
													onEdit={() => openModal(item)}
													onDelete={() => setConfirmDelete(item)}
													editProps={{
														title: `Edit ${title}`,
														ariaLabel: `Edit ${item.name}`,
													}}
													deleteProps={{
														title: `Delete ${title}`,
														ariaLabel: `Delete ${item.name}`,
													}}
												/>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<ConfirmModal
				open={!!confirmDelete}
				title={`Delete ${title}`}
				message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
				confirmLabel="Delete"
				variant="danger"
				loading={deleteItem.isPending}
				onConfirm={handleDelete}
				onCancel={() => setConfirmDelete(null)}
			/>

			<FormModal
				open={Boolean(editing)}
				title={isNew ? `Add ${title}` : `Edit ${title}`}
				subtitle={isNew ? "Enter a name and choose the department" : department?.name}
				onClose={closeModal}
				onSubmit={handleSubmit(onSubmit)}
				submitting={isSubmitting}
				submitLabel={isNew ? `Add ${title}` : "Save changes"}
			>
				<FormField label="Name" error={errors.name}>
					<input
						className="input-field"
						placeholder={`Enter ${title.toLowerCase()}`}
						{...register("name", {
							required: "Name is required",
							maxLength: {
								value: 120,
								message: "Name must not exceed 120 characters",
							},
						})}
					/>
				</FormField>

				<FormField label="Department" error={errors.departmentId}>
					{isNew ? (
						<select
							className="input-field"
							{...register("departmentId", {
								required: "Department is required",
							})}
						>
							<option value="">Select department</option>
							{activeDepartments.map((d) => (
								<option key={d._id} value={d._id}>
									{d.name}
								</option>
							))}
						</select>
					) : (
						<input
							className="input-field"
							value={department?.name ?? ""}
							disabled
							readOnly
						/>
					)}
				</FormField>

				{!isNew && (
					<FormField label="Status">
						<Controller
							name="isActive"
							control={control}
							render={({ field }) => (
								<select
									className="input-field"
									value={field.value ? "true" : "false"}
									onChange={(e) => field.onChange(e.target.value === "true")}
									disabled={isSubmitting}
								>
									<option value="true">Active</option>
									<option value="false">Inactive</option>
								</select>
							)}
						/>
					</FormField>
				)}
			</FormModal>
		</div>
	);
}
