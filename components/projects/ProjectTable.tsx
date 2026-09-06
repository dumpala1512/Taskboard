import React from "react";
import Link from "next/link";
import { MoreVertical, Edit2, Archive, Trash2, Clock } from "lucide-react";
import type { Project } from "../../server/types";
import { useUsers } from "../../hooks/useUsers";
import { useSession } from "next-auth/react";

interface ProjectTableProps {
	projects: Project[];
	onEdit?: (project: Project) => void;
	onArchive?: (project: Project) => void;
	onDelete?: (project: Project) => void;
}

export function ProjectTable({ projects, onEdit, onArchive, onDelete }: ProjectTableProps) {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";
	const { data: users = [] } = useUsers();
	const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

	const statusConfig = {
		PLANNING: { color: "text-blue-700 bg-blue-50 ring-blue-600/20", label: "Planning" },
		ACTIVE: { color: "text-emerald-700 bg-emerald-50 ring-emerald-600/20", label: "Active" },
		ON_HOLD: { color: "text-amber-700 bg-amber-50 ring-amber-600/20", label: "On Hold" },
		COMPLETED: { color: "text-gray-700 bg-gray-50 ring-gray-600/20", label: "Completed" },
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
		<div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
			<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
						<th className="px-6 py-4 font-medium">Project Name</th>
						<th className="px-6 py-4 font-medium">Status</th>
						<th className="px-6 py-4 font-medium">Progress</th>
						<th className="px-6 py-4 font-medium">Owner</th>
						<th className="px-6 py-4 font-medium hidden md:table-cell">Members</th>
						<th className="px-6 py-4 font-medium hidden sm:table-cell">Due Date</th>
						{isAdmin && <th className="px-6 py-4 font-medium text-right">Actions</th>}
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-100">
					{projects.map((project) => {
						const currentStatus = statusConfig[project.status] || statusConfig.ACTIVE;
						const owner = users.find((u) => u.id === project.ownerId);
						const projectMembers = users.filter((u) => project.members.includes(u.id));

						return (
							<tr key={project.id} className="hover:bg-gray-50 transition-colors group">
								{/* Name */}
								<td className="px-6 py-4">
									<Link href={`/projects/${project.id}`}>
										<div className="flex flex-col cursor-pointer group">
											<span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{project.name}</span>
											<span className="text-xs text-gray-500">{project.key || "PRJ"}</span>
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
										<div className="w-24 bg-gray-100 rounded-full h-1.5 hidden sm:block">
											<div
												className={`h-1.5 rounded-full ${
													project.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"
												}`}
												style={{ width: `${project.progress}%` }}
											/>
										</div>
										<span className="text-sm font-medium text-gray-700">{project.progress}%</span>
									</div>
								</td>

								{/* Owner */}
								<td className="px-6 py-4">
									<div className="flex items-center gap-2">
										<div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium">
											{owner?.name.charAt(0) || "U"}
										</div>
										<span className="text-sm text-gray-600">{owner?.name || "Unassigned"}</span>
									</div>
								</td>

								{/* Members */}
								<td className="px-6 py-4 hidden md:table-cell">
									<div className="flex -space-x-2">
										{projectMembers.slice(0, 3).map((member) => (
											<div
												key={member.id}
												className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
												title={member.name}
											>
												{member.name.charAt(0)}
											</div>
										))}
										{projectMembers.length > 3 && (
											<div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">
												+{projectMembers.length - 3}
											</div>
										)}
									</div>
								</td>

								{/* Due Date */}
								<td className="px-6 py-4 hidden sm:table-cell text-sm text-gray-500">
									<div className="flex items-center gap-1.5">
										<Clock className="w-4 h-4" />
										{formatDate(project.dueDate)}
									</div>
								</td>

								{/* Actions */}
								{isAdmin && (
									<td className="px-6 py-4 text-right">
										<div className="relative inline-block text-left">
											<button
												onClick={() => setActiveMenuId(activeMenuId === project.id ? null : project.id)}
												className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
											>
												<MoreVertical className="w-5 h-5" />
											</button>
											
											{activeMenuId === project.id && (
												<>
													<div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
													<div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1">
														<button
															onClick={() => { setActiveMenuId(null); onEdit?.(project); }}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
														>
															<Edit2 className="w-4 h-4" /> Edit Project
														</button>
														<hr className="my-1 border-gray-100" />
														<button
															onClick={() => { setActiveMenuId(null); onDelete?.(project); }}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="w-4 h-4" /> Delete
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								)}
							</tr>
						);
					})}
					{projects.length === 0 && (
						<tr>
							<td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
								No projects found.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
