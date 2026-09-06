import React from "react";
import { useProjects } from "../../../hooks/useProjects";
import { useUsers } from "../../../hooks/useUsers";

interface Step4Props {
	formData: any;
}

export function Step4Review({ formData }: Step4Props) {
	const { data: projects = [] } = useProjects();
	const { data: users = [] } = useUsers();

	const project = projects.find(p => p.id === formData.projectId);
	const assignee = users.find(u => u.id === formData.assigneeId);


	return (
		<div className="space-y-6">
			<div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
				<div>
					<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 ">
						Basic Information
					</h3>
					<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
						<div>
							<dt className="text-slate-500 font-bold">Project</dt>
							<dd className="text-slate-900 font-normal">{project?.name || "None"}</dd>
						</div>
						<div>
							<dt className="text-slate-500 font-bold">Task Type</dt>
							<dd className="text-slate-900 font-normal">{formData.taskType || "None"}</dd>
						</div>
						<div className="sm:col-span-2 overflow-hidden">
							<dt className="text-slate-500 font-bold">Title</dt>
							<dd className="text-slate-900 font-normal break-words">{formData.title}</dd>
						</div>
						<div className="sm:col-span-2 overflow-hidden">
							<dt className="text-slate-500 font-bold">Description</dt>
							<dd 
								className="text-slate-900 font-normal prose prose-sm max-w-none prose-slate max-h-32 overflow-y-auto break-words" 
								dangerouslySetInnerHTML={{ __html: formData.description || "None" }}
							/>
						</div>
						<div>
							<dt className="text-slate-500 font-bold">Priority</dt>
							<dd className="text-slate-900 font-normal">{formData.priority}</dd>
						</div>
					</dl>
				</div>
			</div>

			<div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
				<div>
					<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 ">
						Assignment & Schedule
					</h3>
					<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
						<div>
							<dt className="text-slate-500 font-bold">Assignee</dt>
							<dd className="text-slate-900 font-normal">{assignee?.name || "Unassigned"}</dd>
						</div>
						<div>
							<dt className="text-slate-500 font-bold">Status</dt>
							<dd className="text-slate-900 font-normal">{formData.status}</dd>
						</div>
						<div>
							<dt className="text-slate-500 font-bold">Start Date</dt>
							<dd className="text-slate-900 font-normal">{formData.startDate || "Not set"}</dd>
						</div>
						<div>
							<dt className="text-slate-500 font-bold">Due Date</dt>
							<dd className="text-slate-900 font-normal">{formData.dueDate || "Not set"}</dd>
						</div>
						<div>
							<dt className="text-slate-500 font-bold">Estimated Time</dt>
							<dd className="text-slate-900 font-normal">
								{formData.estimatedTime ? `${formData.estimatedTime} Hours` : "Not set"}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			<div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
				<div>
					<h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 ">
						Additional Details
					</h3>
					<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
						<div className="sm:col-span-2">
							<dt className="text-slate-500 font-bold mb-1">Tags</dt>
							<dd className="flex flex-wrap gap-1">
								{formData.tags && formData.tags.length > 0 ? formData.tags.map((tag: string) => (
									<span key={tag} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium break-words max-w-full">
										{tag}
									</span>
								)) : "None"}
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</div>
	);
}
