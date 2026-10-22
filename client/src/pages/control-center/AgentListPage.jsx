import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { notifications } from "@mantine/notifications";
import { useIsSuperAdmin } from "../../hooks/useAuth";
import {
	useAgents,
	useCreateAgent,
	useDeleteAgent,
	useUpdateAgent,
} from "../../hooks/useMasters";
import { getApiErrorMessage } from "../../lib/queryClient";
import ControlCenterToolbar from "./ControlCenterToolbar";
import ConfirmModal from "../../components/common/ConfirmModal";
import RowActions from "../../components/common/RowActions";
import FormField from "../../components/common/form/FormField";
import FormModal from "../../components/common/form/FormModal";
import Skeleton from "../../components/common/Skeleton";

const EMPTY_FORM = { name: "", isActive: true };

// Agents are shared by every department, so unlike the other master lists there is no department to pick.
export default function AgentListPage() {
	const canManage = useIsSuperAdmin();
	const [search, setSearch] = useState("");
	// "new" while adding, the agent being edited, or null when the modal is closed.
	const [editing, setEditing] = useState(null);
	const [confirmDelete, setConfirmDelete] = useState(null);
	const isNew = editing === "new";

	const { data: agents = [], isLoading: loading } = useAgents({
		includeInactive: canManage,
	});
	const createAgent = useCreateAgent();
	const updateAgent = useUpdateAgent();
	const deleteAgent = useDeleteAgent();
	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors, isSubmitting, isDirty },
	} = useForm({ defaultValues: EMPTY_FORM });

	const term = search.trim().toLowerCase();
	const visibleAgents = agents.filter((agent) =>
		agent.name.toLowerCase().includes(term),
	);

	const openModal = (agent) => {
		setEditing(agent);
		reset(
			agent === "new"
				? EMPTY_FORM
				: { name: agent.name, isActive: agent.isActive },
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
			if (isNew) await createAgent.mutateAsync({ name: data.name });
			else
				await updateAgent.mutateAsync({
					id: editing._id,
					data: { name: data.name, isActive: Boolean(data.isActive) },
				});
			notifications.show({
				message: isNew ? "Agent added" : "Agent updated",
				color: "green",
			});
			closeModal();
		} catch (err) {
			notifications.show({
				message: getApiErrorMessage(err, "Failed to save agent"),
				color: "red",
			});
		}
	};

	const handleDelete = () => {
		deleteAgent.mutate(confirmDelete._id, {
			onSuccess: () =>
				notifications.show({ message: "Agent deleted", color: "green" }),
			onError: (err) =>
				notifications.show({
					message: getApiErrorMessage(err, "Delete failed"),
					color: "red",
				}),
			onSettled: () => setConfirmDelete(null),
		});
	};

	return (
		<div>
			<ControlCenterToolbar
				title="Agent"
				subtitle={`Shared by all departments · ${agents.length} agent${agents.length !== 1 ? "s" : ""}`}
				search={search}
				onSearchChange={setSearch}
				searchPlaceholder="Search agents..."
				showAction={canManage}
				actionLabel="Add Agent"
				onAction={() => openModal("new")}
			/>

			<div className="card overflow-hidden">
				{loading ? (
					<div className="p-6 space-y-3">
						{[0, 1, 2].map((row) => (
							<Skeleton key={row} className="h-4 w-full" />
						))}
					</div>
				) : visibleAgents.length === 0 ? (
					<div className="text-center py-16">
						<p className="company-empty-title">
							{agents.length === 0
								? "No agents yet"
								: "No agents match your search"}
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
								{visibleAgents.map((agent, index) => (
									<tr key={agent._id}>
										<td className="text-center">{index + 1}</td>
										<td className="settings-user-name">{agent.name}</td>
										<td className="text-center">
											<span
												className={
													agent.isActive
														? "company-status-active"
														: "company-status-inactive"
												}
											>
												{agent.isActive ? "Active" : "Inactive"}
											</span>
										</td>
										{canManage && (
											<td className="text-center">
												<RowActions
													onEdit={() => openModal(agent)}
													onDelete={() => setConfirmDelete(agent)}
													editProps={{
														title: "Edit Agent",
														ariaLabel: `Edit ${agent.name}`,
													}}
													deleteProps={{
														title: "Delete Agent",
														ariaLabel: `Delete ${agent.name}`,
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
				title="Delete Agent"
				message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
				confirmLabel="Delete"
				variant="danger"
				loading={deleteAgent.isPending}
				onConfirm={handleDelete}
				onCancel={() => setConfirmDelete(null)}
			/>

			<FormModal
				open={Boolean(editing)}
				title={isNew ? "Add Agent" : "Edit Agent"}
				subtitle={isNew ? "Enter the agent's name" : editing?.name}
				onClose={closeModal}
				onSubmit={handleSubmit(onSubmit)}
				submitting={isSubmitting}
				submitLabel={isNew ? "Add Agent" : "Save changes"}
			>
				<FormField label="Name" error={errors.name}>
					<input
						className="input-field"
						placeholder="Enter agent name"
						{...register("name", {
							required: "Name is required",
							maxLength: {
								value: 120,
								message: "Name must not exceed 120 characters",
							},
						})}
					/>
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
