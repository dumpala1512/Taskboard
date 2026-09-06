import React from "react";
import { useProjects } from "../../../hooks/useProjects";
import type { TaskType } from "../../../server/types";
import { Input } from "../../ui/Input";
import { RichTextEditor } from "../../ui/RichTextEditor";

interface Step1Props {
	formData: any;
	setFormData: (data: any) => void;
	errors: Record<string, string>;
	isFixedProject?: boolean;
}

export function Step1BasicInfo({
	formData,
	setFormData,
	errors,
	isFixedProject,
}: Step1Props) {
	const { data: projects = [] } = useProjects();

	return (
		<div className="space-y-6">
			{!isFixedProject && (
				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 dark:text-slate-200">
						Project <span className="text-red-500">*</span>
					</label>
					<select
						value={formData.projectId}
						onChange={(e) =>
							setFormData({
								...formData,
								projectId: e.target.value,
								assigneeId: "",
							})
						} // clear assignee on project change
						className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1A233A] text-slate-900 dark:text-slate-100 ${errors.projectId ? "border-red-500" : "border-slate-200 dark:border-[#222F49]"}`}
					>
						<option value="">Select Project</option>
						{projects.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
					{errors.projectId && (
						<p className="text-xs text-red-500 mt-1">{errors.projectId}</p>
					)}
				</div>
			)}

			<div className="space-y-1">
				<label className="text-sm font-medium text-slate-700 dark:text-slate-200">
					Task Title <span className="text-red-500">*</span>
				</label>
				<Input
					value={formData.title}
					onChange={(e) => setFormData({ ...formData, title: e.target.value })}
					placeholder="e.g. Implement login feature"
					className={errors.title ? "border-red-500" : ""}
					maxLength={100}
				/>
				{errors.title && (
					<p className="text-xs text-red-500 mt-1">{errors.title}</p>
				)}
			</div>

			<div className="space-y-1">
				<label className="text-sm font-medium text-slate-700 dark:text-slate-200">
					Description <span className="text-red-500">*</span>
				</label>
				<RichTextEditor
					value={formData.description}
					onChange={(val) => setFormData({ ...formData, description: val })}
					placeholder="Detailed description of the task..."
					error={!!errors.description}
					maxLength={1000}
				/>
				{errors.description && (
					<p className="text-xs text-red-500 mt-1">{errors.description}</p>
				)}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 dark:text-slate-200">
						Priority <span className="text-red-500">*</span>
					</label>
					<select
						value={formData.priority}
						onChange={(e) =>
							setFormData({ ...formData, priority: e.target.value })
						}
						className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#1A233A] text-slate-900 dark:text-slate-100 ${errors.priority ? "border-red-500" : "border-slate-200 dark:border-[#222F49]"}`}
					>
						<option value="LOW">Low</option>
						<option value="MEDIUM">Medium</option>
						<option value="HIGH">High</option>
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm font-medium text-slate-700 dark:text-slate-200">
						Task Type
					</label>
					<select
						value={formData.taskType}
						onChange={(e) =>
							setFormData({ ...formData, taskType: e.target.value as TaskType })
						}
						className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-200 dark:border-[#222F49] bg-white dark:bg-[#1A233A] text-slate-900 dark:text-slate-100"
					>
						<option value="">Select Type</option>
						<option value="Feature">Feature</option>
						<option value="Bug">Bug</option>
						<option value="Improvement">Improvement</option>
						<option value="Research">Research</option>
						<option value="Documentation">Documentation</option>
					</select>
				</div>
			</div>
		</div>
	);
}
