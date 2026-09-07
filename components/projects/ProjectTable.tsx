import React from "react";
import Link from "next/link";
import { Edit2, Trash2, Clock } from "lucide-react";
import type { Project } from "../../server/types";
import { useUsers } from "../../hooks/useUsers";
import { useSession } from "next-auth/react";

interface ProjectTableProps {
	projects: Project[];
	onEdit?: (project: Project) => void;
	onDelete?: (project: Project) => void;
}

export function ProjectTable({ projects, onEdit, onDelete }: ProjectTableProps) {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";
	const { data: users = [] } = useUsers();

	const statusConfig = {
		PLANNING: {
			color:
				"text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 ring-blue-600/20 dark:ring-blue-500/30",
			label: "Planning",
		},
		ACTIVE: {
			color:
				"text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 ring-emerald-600/20 dark:ring-emerald-500/30",
			label: "Active",
		},
		ON_HOLD: {
			color:
				"text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 ring-amber-600/20 dark:ring-amber-500/30",
			label: "On Hold",
		},
		COMPLETED: {
			color:
				"text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 ring-gray-600/20 dark:ring-slate-700",
			label: "Completed",
		},
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#222F49] bg-white dark:bg-[#131B2E]">
			<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-gray-50 dark:bg-[#1A233A] border-b border-gray-200 dark:border-[#222F49] text-sm text-gray-500 dark:text-slate-400">
						<th className="px-6 py-4 font-medium">Project Name</th>
						<th className="px-6 py-4 font-medium">Status</th>
						<th className="px-6 py-4 font-medium">Progress</th>
						<th className="px-6 py-4 font-medium">Owner</th>
						<th className="px-6 py-4 font-medium hidden md:table-cell">Members</th>
						<th className="px-6 py-4 font-medium hidden sm:table-cell">Due Date</th>
						{isAdmin && <th className="px-6 py-4 font-medium text-right">Actions</th>}
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100 dark:divide-[#222F49]">
					{projects.map((project) => {
						const currentStatus = statusConfig[project.status] || statusConfig.ACTIVE;
						const owner = users.find((u) => u.id === project.ownerId);
						const projectMembers = users.filter((u) => project.members.includes(u.id));

						return (
							<tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-[#1A233A] transition-colors group">
								{/* Name */}
								<td className="px-6 py-4">
									<Link href={`/projects/${project.id}`}>
										<div className="flex flex-col cursor-pointer group">
											<span className="font-medium text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
												{project.name}
											</span>
											<span className="text-xs text-gray-500 dark:text-slate-400">{project.key || "PRJ"}</span>
										</div>
									</Link>
								</td>
								
								{/* Status */}
								<td className="px-6 py-4">
									<span
										className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${currentStatus.color}`}
									>
										{currentStatus.label}
									</span>
								</td>

								{/* Progress */}
								<td className="px-6 py-4">
									<div className="flex items-center gap-2">
										<div className="w-24 bg-gray-100 dark:bg-[#1A233A] rounded-full h-1.5 hidden sm:block">
											<div
												className={`h-1.5 rounded-full ${
													project.progress === 100
														? "bg-emerald-500"
														: "bg-indigo-600 dark:bg-sky-500"
												}`}
												style={{ width: `${project.progress}%` }}
											/>
										</div>
										<span className="text-sm font-medium text-gray-700 dark:text-slate-200">{project.progress}%</span>
									</div>
								</td>

								{/* Owner */}
								<td className="px-6 py-4">
									<div className="flex items-center gap-2">
										<div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-medium">
											{owner?.name.charAt(0) || "U"}
										</div>
										<span className="text-sm text-gray-600 dark:text-slate-300">{owner?.name || "Unassigned"}</span>
									</div>
								</td>

								{/* Members */}
								<td className="px-6 py-4 hidden md:table-cell">
									<div className="flex -space-x-2">
										{projectMembers.slice(0, 3).map((member) => (
											<div
												key={member.id}
												className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 border-2 border-white dark:border-[#131B2E] flex items-center justify-center text-xs font-medium text-gray-600 dark:text-slate-300"
												title={member.name}
											>
												{member.name.charAt(0)}
											</div>
										))}
										{projectMembers.length > 3 && (
											<div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-slate-800 border-2 border-white dark:border-[#131B2E] flex items-center justify-center text-xs font-medium text-gray-500 dark:text-slate-400">
												+{projectMembers.length - 3}
											</div>
										)}
									</div>
								</td>

								{/* Due Date */}
								<td className="px-6 py-4 hidden sm:table-cell text-sm text-gray-500 dark:text-slate-400">
									<div className="flex items-center gap-1.5">
										<Clock className="w-4 h-4" />
										{formatDate(project.dueDate)}
									</div>
								</td>

								{/* Actions */}
								{isAdmin && (
									<td className="px-6 py-4 text-right whitespace-nowrap">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => onEdit?.(project)}
												className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
												title="Edit Project"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												onClick={() => onDelete?.(project)}
												className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
												title="Delete Project"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</td>
								)}
							</tr>
						);
					})}
					{projects.length === 0 && (
						<tr>
							<td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
								No projects found.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
