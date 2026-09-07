import React, { useMemo } from "react";
import { Input } from "../../ui/Input";
import { useUsers } from "../../../hooks/useUsers";
import { useProjects } from "../../../hooks/useProjects";
import type { TaskStatus } from "../../../server/types";
import { Link } from "lucide-react";

interface Step2Props {
	formData: any;
	setFormData: (data: any) => void;
	errors: Record<string, string>;
	onBlurField?: (field: string, value: any) => void;
}

export function Step2Assignment({
	formData,
	setFormData,
	errors,
	onBlurField,
}: Step2Props) {
	const { data: users = [] } = useUsers();
	const { data: projects = [] } = useProjects();

	const project = projects.find((p) => p.id === formData.projectId);

	const projectMembers = useMemo(() => {
		if (!formData.projectId) return [];
		return users;
	}, [formData.projectId, users]);

	React.useEffect(() => {
		if (project?.columns && project.columns.length > 0) {
			const validStatuses = ["BACKLOG", ...project.columns.map((c) => c.id)];
			if (!validStatuses.includes(formData.status)) {
				setFormData({
					...formData,
					status: project.columns[0]?.id || "BACKLOG",
				});
			}
		}
	}, [project?.columns]);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 dark:text-slate-200">
						Assignee
					</label>
					{!formData.projectId ? (
						<div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#222F49]">
							Select a project in Step 1 first.
						</div>
					) : (
						<select
							value={formData.assigneeId || ""}
							onChange={(e) => {
								const val = e.target.value;
								setFormData({ ...formData, assigneeId: val });
								onBlurField?.("assigneeId", val);
							}}
							onBlur={() => onBlurField?.("assigneeId", formData.assigneeId)}
							className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1A233A] text-slate-900 dark:text-slate-100 ${
								errors.assigneeId
									? "border-red-500 focus:ring-red-500"
									: "border-slate-200 dark:border-[#222F49]"
							}`}
						>
							<option value="">Unassigned</option>
							{projectMembers.map((u) => {
								const isMember =
									project &&
									(project.ownerId === u.id ||
										(Array.isArray(project.members) &&
											project.members.includes(u.id)));
								return (
									<option key={u.id} value={u.id} className="dark:bg-[#1A233A]">
										{u.name} ({u.email})
										{isMember ? "" : " — (Not in project)"}
									</option>
								);
							})}
						</select>
					)}
					{errors.assigneeId && (
						<p className="text-xs text-red-500 mt-1 font-medium">
							{errors.assigneeId}
						</p>
					)}
				</div>

				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status <span className="text-red-500">*</span></label>
					<select
						value={formData.status}
						onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
						onBlur={() => onBlurField?.("status", formData.status)}
						className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1A233A] text-slate-900 dark:text-slate-100 ${errors.status ? "border-red-500" : "border-slate-200 dark:border-[#222F49]"}`}
					>
						<option value="BACKLOG" className="dark:bg-[#1A233A]">Backlog</option>
						{(project?.columns && project.columns.length > 0
							? project.columns
							: [
									{ id: "TODO", title: "To Do" },
									{ id: "IN_PROGRESS", title: "In Progress" },
									{ id: "REVIEW", title: "Review" },
									{ id: "DONE", title: "Done" },
							  ]
						)
							.filter((col) => col.id !== "BACKLOG")
							.map((col) => (
								<option key={col.id} value={col.id} className="dark:bg-[#1A233A]">
									{col.title}
								</option>
							))}
					</select>
				</div>

				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 ">Start Date <span className="text-red-500">*</span></label>
					<Input
						type="date"
						value={formData.startDate || ""}
						onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
						onBlur={() => onBlurField?.("startDate", formData.startDate)}
						className={errors.startDate ? "border-red-500" : ""}
					/>
					{errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
				</div>

				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 ">Due Date <span className="text-red-500">*</span></label>
					<Input
						type="date"
						value={formData.dueDate || ""}
						onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
						onBlur={() => onBlurField?.("dueDate", formData.dueDate)}
						className={errors.dueDate ? "border-red-500" : ""}
					/>
					{errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
				</div>

				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 ">Estimated Time (Hours)</label>
					<Input
						type="number"
						min="0"
						step="0.5"
						value={formData.estimatedTime || ""}
						onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value ? parseFloat(e.target.value) : null })}
						placeholder="e.g. 4.5"
						className={errors.estimatedTime ? "border-red-500" : ""}
					/>
					{errors.estimatedTime && <p className="text-xs text-red-500 mt-1">{errors.estimatedTime}</p>}
				</div>

				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 ">Estimated Points</label>
					<Input
						type="number"
						min="0"
						max="100"
						value={formData.points || 0}
						onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
						placeholder="e.g. 5"
					/>
				</div>
			</div>
		</div>
	);
}
