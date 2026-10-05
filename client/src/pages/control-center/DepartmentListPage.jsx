import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { notifications } from "@mantine/notifications";
import { useIsSuperAdmin } from "../../hooks/useAuth";
import {
	useCreateDepartment,
	useDepartments,
	useUpdateDepartment,
} from "../../hooks/useMasters";
import { getApiErrorMessage } from "../../lib/queryClient";
import ControlCenterToolbar from "./ControlCenterToolbar";
import RowActions from "../../components/common/RowActions";
import Skeleton from "../../components/common/Skeleton";

const CODE_PATTERN = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
const EMPTY_FORM = { name: "", code: "", isActive: true };

export default function DepartmentListPage() {
	const canManage = useIsSuperAdmin();
	const [search, setSearch] = useState("");
	// "new" while adding, the department being edited, or null when the modal is closed.
	const [editing, setEditing] = useState(null);
	const isNew = editing === "new";

	const { data: departments = [], isLoading: loading } = useDepartments({
		includeInactive: canManage,
	});
	const createDepartment = useCreateDepartment();
	const updateDepartment = useUpdateDepartment();
	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors, isSubmitting, isDirty },
	} = useForm({ defaultValues: EMPTY_FORM });

	const term = search.trim().toLowerCase();
	const visibleDepartments = departments.filter((d) =>
		`${d.name} ${d.code}`.toLowerCase().includes(term),
	);

	const openModal = (department) => {
		setEditing(department);
		reset(
			department === "new"
				? EMPTY_FORM
				: {
						name: department.name,
						code: department.code,
						isActive: department.isActive,
					},
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
				await createDepartment.mutateAsync({
					name: data.name,
					code: data.code,
				});
			} else {
				await updateDepartment.mutateAsync({
					id: editing._id,
					data: {
						name: data.name,
						code: data.code,
						isActive: Boolean(data.isActive),
					},
				});
			}
			notifications.show({
				message: isNew ? "Department created" : "Department updated",
				color: "green",
			});
			closeModal();
		} catch (err) {
			notifications.show({
				message: getApiErrorMessage(err, "Failed to save department"),
				color: "red",
			});
		}
	};

	return (
		<div>
			<ControlCenterToolbar
				title="Departments"
				subtitle={`Group users and master lists · ${departments.length} department${departments.length !== 1 ? "s" : ""}`}
				search={search}
				onSearchChange={setSearch}
				searchPlaceholder="Search departments..."
				showAction={canManage}
				actionLabel="Add Department"
				onAction={() => openModal("new")}
			/>

			<div className="card overflow-hidden">
				{loading ? (
					<div className="p-6 space-y-3">
						{[0, 1, 2].map((row) => (
							<Skeleton key={row} className="h-4 w-full" />
						))}
					</div>
				) : visibleDepartments.length === 0 ? (
					<div className="text-center py-16">
						<p className="company-empty-title">
							{departments.length === 0
								? "No departments yet"
								: "No departments match your search"}
						</p>
						{departments.length === 0 && canManage && (
							<p className="company-empty-desc">
								Add a department to start assigning users and master lists
							</p>
						)}
					</div>
				) : (
					<div className="table-wrapper">
						<table style={{ tableLayout: "auto" }}>
							<thead>
								<tr>
									<th className="text-center">S.No.</th>
									<th className="text-center">Name</th>
									<th className="text-center">Code</th>
									<th className="text-center">Status</th>
									{canManage && <th className="text-center">Actions</th>}
								</tr>
							</thead>
							<tbody>
								{visibleDepartments.map((d, index) => (
									<tr key={d._id}>
										<td className="text-center">{index + 1}</td>
										<td className="settings-user-name">{d.name}</td>
										<td className="settings-user-email">{d.code}</td>
										<td className="text-center">
											<span
												className={
													d.isActive
														? "company-status-active"
														: "company-status-inactive"
												}
											>
												{d.isActive ? "Active" : "Inactive"}
											</span>
										</td>
										{canManage && (
											<td className="text-center">
												<RowActions
													onEdit={() => openModal(d)}
													editProps={{
														title: "Edit department",
														ariaLabel: `Edit ${d.name}`,
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

			{editing && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
					onClick={isSubmitting ? undefined : closeModal}
				>
					<div
						className="company-form-panel max-w-lg"
						role="dialog"
						aria-modal="true"
						aria-labelledby="department-modal-title"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="company-form-header">
							<div>
								<h2
									id="department-modal-title"
									className="company-form-title"
								>
									{isNew ? "Add Department" : "Edit Department"}
								</h2>
								<p className="company-form-subtitle">
									{isNew
										? "Create a new department"
										: "Update the name, code or status of this department"}
								</p>
							</div>
							<button
								type="button"
								onClick={closeModal}
								disabled={isSubmitting}
								className="company-form-close-btn"
								aria-label="Close"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
							<div>
								<label className="company-form-field-label">Name</label>
								<input
									className="input-field"
									placeholder="e.g. General Insurance"
									{...register("name", { required: "Name is required" })}
								/>
								{errors.name && (
									<p className="text-red-500 text-xs mt-1">
										{errors.name.message}
									</p>
								)}
							</div>

							<div>
								<label className="company-form-field-label">Code</label>
								<input
									className="input-field"
									placeholder="e.g. GI"
									{...register("code", {
										required: "Code is required",
										maxLength: {
											value: 20,
											message: "Code must not exceed 20 characters",
										},
										pattern: {
											value: CODE_PATTERN,
											message: "Letters, numbers and hyphens only",
										},
									})}
								/>
								{errors.code && (
									<p className="text-red-500 text-xs mt-1">
										{errors.code.message}
									</p>
								)}
								<p className="company-form-section-hint mt-1">
									A short unique key, saved in capitals.
								</p>
							</div>

							{!isNew && (
								<div>
									<label className="company-form-field-label">Status</label>
									<Controller
										name="isActive"
										control={control}
										render={({ field }) => (
											<select
												className="input-field"
												value={field.value ? "true" : "false"}
												onChange={(e) =>
													field.onChange(e.target.value === "true")
												}
												disabled={isSubmitting}
											>
												<option value="true">Active</option>
												<option value="false">Inactive</option>
											</select>
										)}
									/>
									<p className="company-form-section-hint mt-1">
										Existing users and master lists keep this department when it
										is made inactive.
									</p>
								</div>
							)}

							<div className="company-form-footer">
								<button
									type="button"
									onClick={closeModal}
									disabled={isSubmitting}
									className="btn-secondary"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="btn-primary"
								>
									{isSubmitting
										? "Saving..."
										: isNew
											? "Add Department"
											: "Save changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
