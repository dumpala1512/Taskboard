import React from "react";
import Link from "next/link";
import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Project } from "../../server/types";
import { useUsers } from "../../hooks/useUsers";
import { useSession } from "next-auth/react";

interface ProjectCardProps {
	project: Project;
	onEdit?: (project: Project) => void;
	onDelete?: (project: Project) => void;
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; className: string }
> = {
	PLANNING: {
		label: "Planning",
		className:
			"text-[#2196F3] bg-[#E3F2FD] dark:text-[#38BDF8] dark:bg-sky-950/60 border border-[#BBDEFB]/60 dark:border-sky-800/40",
	},
	ACTIVE: {
		label: "Active",
		className:
			"text-[#43A047] bg-[#E8F5E9] dark:text-[#4ADE80] dark:bg-emerald-950/60 border border-[#C8E6C9]/60 dark:border-emerald-800/40",
	},
	ON_HOLD: {
		label: "On Hold",
		className:
			"text-[#FB8C00] bg-[#FFF3E0] dark:text-[#FBBF24] dark:bg-amber-950/60 border border-[#FFE0B2]/60 dark:border-amber-800/40",
	},
	COMPLETED: {
		label: "Completed",
		className:
			"text-[#9E9E9E] bg-[#F5F5F5] dark:text-[#94A3B8] dark:bg-slate-800/60 border border-[#E0E0E0]/60 dark:border-slate-700/40",
	},
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";
	const { data: users = [] } = useUsers();
	const [menuOpen, setMenuOpen] = React.useState(false);

	// Get member details
	const projectMembers = users.filter((u) => project.members.includes(u.id));
	const owner = users.find((u) => u.id === project.ownerId);

	const currentStatus = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PLANNING;

	const formatDate = (dateString?: string) => {
		if (!dateString) return "No date set";
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div className="bg-white dark:bg-[#131B2E] rounded-md border border-[#E0E3E8] dark:border-[#222F49] p-5 flex flex-col hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.40)] hover:border-[#90CAF9] dark:hover:border-sky-600 transition-all duration-150 relative">
			{/* Header */}
			<div className="flex justify-between items-start mb-3.5">
				<div className="flex gap-3 min-w-0 flex-1">
					{/* Project initial avatar */}
					<div className="w-9 h-9 rounded bg-[#E3F2FD] dark:bg-sky-950/60 border border-[#BBDEFB] dark:border-sky-800/50 flex items-center justify-center text-[#1E88E5] dark:text-sky-400 text-sm font-bold flex-shrink-0">
						{project.name.charAt(0).toUpperCase()}
					</div>
					<div className="min-w-0 flex-1">
						<Link href={`/projects/${project.id}`}>
							<h3 className="text-base font-semibold text-[#33475B] dark:text-slate-100 truncate hover:text-[#1E88E5] dark:hover:text-sky-400 cursor-pointer transition-colors">
								{project.name}
							</h3>
						</Link>
						<p className="text-xs text-[#9EAAB7] dark:text-slate-400 font-medium mt-0.5">
							{project.key}
						</p>
					</div>
				</div>

				{isAdmin && (
					<div className="relative flex-shrink-0 ml-2">
						<button
							onClick={(e) => {
								e.preventDefault();
								setMenuOpen(!menuOpen);
							}}
							className="p-1.5 text-[#9EAAB7] dark:text-slate-400 hover:text-[#6E7B8B] dark:hover:text-slate-200 hover:bg-[#F5F6F8] dark:hover:bg-[#1A233A] rounded-sm transition-colors"
						>
							<MoreVertical className="w-4 h-4" />
						</button>
						{menuOpen && (
							<div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#131B2E] border border-[#E0E3E8] dark:border-[#222F49] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.12)] py-1 z-10">
								<button
									onClick={(e) => {
										e.preventDefault();
										onEdit?.(project);
										setMenuOpen(false);
									}}
									className="w-full text-left px-3 py-1.5 text-sm text-[#33475B] dark:text-slate-200 hover:bg-[#F5F6F8] dark:hover:bg-[#1A233A] hover:text-[#1E88E5] dark:hover:text-sky-400 flex items-center gap-2 transition-colors"
								>
									<Pencil className="w-3.5 h-3.5 text-[#9EAAB7] dark:text-slate-400" /> Edit
								</button>
								<div className="border-t border-[#EEF0F3] dark:border-[#222F49] my-1" />
								<button
									onClick={(e) => {
										e.preventDefault();
										onDelete?.(project);
										setMenuOpen(false);
									}}
									className="w-full text-left px-3 py-1.5 text-sm text-[#E53935] hover:bg-[#FFEBEE] dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
								>
									<Trash2 className="w-3.5 h-3.5 text-[#E53935]" /> Delete
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			<p className="text-sm text-[#6E7B8B] dark:text-slate-400 mb-3 line-clamp-2 break-words leading-relaxed">
				{project.description}
			</p>

			{/* Project Tags */}
			{project.tags && project.tags.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-3.5">
					{project.tags.slice(0, 3).map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 max-w-[120px] truncate"
							title={tag}
						>
							{tag}
						</span>
					))}
					{project.tags.length > 3 && (
						<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-[#1A233A] text-gray-500 dark:text-slate-400">
							+{project.tags.length - 3}
						</span>
					)}
				</div>
			)}

			{/* Status & Progress */}
			<div className="space-y-2.5 mb-4">
				<div className="flex items-center justify-between">
					<span
						className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${currentStatus.className}`}
					>
						{currentStatus.label}
					</span>
					<span className="text-xs font-semibold text-[#33475B] dark:text-slate-200">
						{project.progress}%
					</span>
				</div>
				{/* Progress bar */}
				<div className="w-full bg-[#F0F2F5] dark:bg-[#1A233A] rounded-full h-1.5 overflow-hidden">
					<div
						className={`h-1.5 rounded-full transition-all duration-500 ${
							project.progress === 100
								? "bg-[#43A047] dark:bg-emerald-500"
								: "bg-[#1E88E5] dark:bg-sky-500"
						}`}
						style={{
							width: `${project.progress}%`,
						}}
					/>
				</div>
			</div>

			<hr className="border-[#EEF0F3] dark:border-[#222F49] mb-3.5" />

			{/* Footer */}
			<div className="flex items-center justify-between mt-auto">
				<div className="flex items-center text-[#9EAAB7] dark:text-slate-400 text-xs gap-1.5">
					<Clock className="w-3.5 h-3.5" />
					<span>{formatDate(project.dueDate || project.updatedAt)}</span>
				</div>
				<div className="flex items-center gap-1.5">
					{/* Owner */}
					{owner && (
						<div
							className="w-6 h-6 rounded-full bg-[#E3F2FD] dark:bg-sky-950/70 border-2 border-white dark:border-[#131B2E] flex items-center justify-center text-[10px] font-semibold text-[#1E88E5] dark:text-sky-400"
							title={`Owner: ${owner.name}`}
						>
							{owner.name.charAt(0)}
						</div>
					)}
					{/* Members */}
					<div className="flex -space-x-1.5">
						{projectMembers.slice(0, 3).map((member) => (
							<div
								key={member.id}
								className="w-6 h-6 rounded-full bg-[#F5F6F8] dark:bg-[#1A233A] border-2 border-white dark:border-[#131B2E] flex items-center justify-center text-[10px] font-medium text-[#6E7B8B] dark:text-slate-300"
								title={member.name}
							>
								{member.name.charAt(0)}
							</div>
						))}
						{projectMembers.length > 3 && (
							<div
								className="w-6 h-6 rounded-full bg-[#EEF0F3] dark:bg-[#222F49] border-2 border-white dark:border-[#131B2E] flex items-center justify-center text-[10px] font-medium text-[#9EAAB7] dark:text-slate-400"
								title={`+${projectMembers.length - 3} more members`}
							>
								+{projectMembers.length - 3}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
