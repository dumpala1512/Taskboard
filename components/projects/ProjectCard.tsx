import React from "react";
import Link from "next/link";
import { Clock, MoreVertical, Pencil, Archive, Trash2 } from "lucide-react";
import type { Project } from "../../server/types";
import { useUsers } from "../../hooks/useUsers";
import { useSession } from "next-auth/react";

interface ProjectCardProps {
	project: Project;
	onEdit?: (project: Project) => void;
	onArchive?: (project: Project) => void;
	onDelete?: (project: Project) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
	PLANNING:  { label: 'Planning',  color: '#2196F3', bg: '#E3F2FD' },
	ACTIVE:    { label: 'Active',    color: '#43A047', bg: '#E8F5E9' },
	ON_HOLD:   { label: 'On Hold',   color: '#FB8C00', bg: '#FFF3E0' },
	COMPLETED: { label: 'Completed', color: '#9E9E9E', bg: '#F5F5F5' },
};

export function ProjectCard({ project, onEdit, onArchive, onDelete }: ProjectCardProps) {
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
		<div className="bg-white rounded-md border border-[#E0E3E8] p-5 flex flex-col hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:border-[#90CAF9] transition-all duration-150 relative">
			{/* Header */}
			<div className="flex justify-between items-start mb-3.5">
				<div className="flex gap-3 min-w-0 flex-1">
					{/* Project initial avatar */}
					<div className="w-9 h-9 rounded bg-[#E3F2FD] border border-[#BBDEFB] flex items-center justify-center text-[#1E88E5] text-sm font-bold flex-shrink-0">
						{project.name.charAt(0).toUpperCase()}
					</div>
					<div className="min-w-0 flex-1">
						<Link href={`/projects/${project.id}`}>
							<h3 className="text-base font-semibold text-[#33475B] truncate hover:text-[#1E88E5] cursor-pointer transition-colors">
								{project.name}
							</h3>
						</Link>
						<p className="text-xs text-[#9EAAB7] font-medium mt-0.5">
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
							className="p-1.5 text-[#9EAAB7] hover:text-[#6E7B8B] hover:bg-[#F5F6F8] rounded-sm transition-colors"
						>
							<MoreVertical className="w-4 h-4" />
						</button>
						{menuOpen && (
							<div className="absolute right-0 mt-1 w-36 bg-white border border-[#E0E3E8] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.12)] py-1 z-10">
								<button
									onClick={(e) => { e.preventDefault(); onEdit?.(project); setMenuOpen(false); }}
									className="w-full text-left px-3 py-1.5 text-sm text-[#33475B] hover:bg-[#F5F6F8] hover:text-[#1E88E5] flex items-center gap-2 transition-colors"
								>
									<Pencil className="w-3.5 h-3.5 text-[#9EAAB7]" /> Edit
								</button>
								<div className="border-t border-[#EEF0F3] my-1" />
								<button
									onClick={(e) => { e.preventDefault(); onDelete?.(project); setMenuOpen(false); }}
									className="w-full text-left px-3 py-1.5 text-sm text-[#E53935] hover:bg-[#FFEBEE] flex items-center gap-2 transition-colors"
								>
									<Trash2 className="w-3.5 h-3.5 text-[#E53935]" /> Delete
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			<p className="text-sm text-[#6E7B8B] mb-4 line-clamp-2 break-words leading-relaxed">
				{project.description}
			</p>

			{/* Status & Progress */}
			<div className="space-y-2.5 mb-4">
				<div className="flex items-center justify-between">
					<span
						className="text-xs font-semibold px-2 py-0.5 rounded-sm"
						style={{ color: currentStatus.color, background: currentStatus.bg }}
					>
						{currentStatus.label}
					</span>
					<span className="text-xs font-semibold text-[#33475B]">{project.progress}%</span>
				</div>
				{/* Progress bar */}
				<div className="w-full bg-[#F0F2F5] rounded-full h-1.5">
					<div
						className="h-1.5 rounded-full transition-all duration-500"
						style={{
							width: `${project.progress}%`,
							background: project.progress === 100 ? '#43A047' : '#1E88E5',
						}}
					/>
				</div>
			</div>

			<hr className="border-[#EEF0F3] mb-3.5" />

			{/* Footer */}
			<div className="flex items-center justify-between mt-auto">
				<div className="flex items-center text-[#9EAAB7] text-xs gap-1.5">
					<Clock className="w-3.5 h-3.5" />
					<span>{formatDate(project.dueDate || project.updatedAt)}</span>
				</div>
				<div className="flex items-center gap-1.5">
					{/* Owner */}
					{owner && (
						<div
							className="w-6 h-6 rounded-full bg-[#E3F2FD] border-2 border-white flex items-center justify-center text-[10px] font-semibold text-[#1E88E5]"
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
								className="w-6 h-6 rounded-full bg-[#F5F6F8] border-2 border-white flex items-center justify-center text-[10px] font-medium text-[#6E7B8B]"
								title={member.name}
							>
								{member.name.charAt(0)}
							</div>
						))}
						{projectMembers.length > 3 && (
							<div className="w-6 h-6 rounded-full bg-[#EEF0F3] border-2 border-white flex items-center justify-center text-[10px] font-medium text-[#9EAAB7]">
								+{projectMembers.length - 3}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
