import { Calendar, Plus, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import type { Project } from "../../../server/types";
import { Button } from "../../ui/Button";

interface ProjectHeaderProps {
	project: Project;
	onCreateTask?: () => void;
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; className: string }
> = {
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
	PLANNING: {
		label: "Planning",
		className:
			"text-[#2196F3] bg-[#E3F2FD] dark:text-[#38BDF8] dark:bg-sky-950/60 border border-[#BBDEFB]/60 dark:border-sky-800/40",
	},
	COMPLETED: {
		label: "Completed",
		className:
			"text-[#9E9E9E] bg-[#F5F5F5] dark:text-[#94A3B8] dark:bg-slate-800/60 border border-[#E0E0E0]/60 dark:border-slate-700/40",
	},
};

export default function ProjectHeader({
	project,
	onCreateTask,
}: ProjectHeaderProps) {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";

	const sCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PLANNING;

	return (
		<div className="bg-white dark:bg-[#131B2E] rounded-md border border-[#E0E3E8] dark:border-[#222F49] px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
			<div>
				<div className="flex items-center gap-2 mb-1.5">
					<span className="text-xs font-semibold text-[#6E7B8B] dark:text-slate-300 bg-[#F5F6F8] dark:bg-[#1A233A] border border-[#E0E3E8] dark:border-[#222F49] px-2 py-0.5 rounded-sm">
						{project.key}
					</span>
					<span
						className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${sCfg.className}`}
					>
						{sCfg.label}
					</span>
				</div>

				<h1 className="text-2xl font-semibold text-[#33475B] dark:text-slate-100 break-words leading-snug">
					{project.name}
				</h1>

				<div className="flex items-center gap-5 mt-2 text-xs text-[#6E7B8B] dark:text-slate-400">
					<div className="flex items-center gap-1.5">
						<Calendar className="w-3.5 h-3.5 text-[#9EAAB7] dark:text-slate-400" />
						<span>
							{(project.startDate ? new Date(project.startDate) : new Date(project.createdAt)).toLocaleDateString()} —{" "}
							{project.dueDate
								? new Date(project.dueDate).toLocaleDateString()
								: "Ongoing"}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Users className="w-3.5 h-3.5 text-[#9EAAB7] dark:text-slate-400" />
						<span>{project.members?.length || 0} Members</span>
					</div>
				</div>

				{project.tags && project.tags.length > 0 && (
					<div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
						{project.tags.map((tag) => (
							<span
								key={tag}
								className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
							>
								{tag}
							</span>
						))}
					</div>
				)}
			</div>

			{isAdmin && onCreateTask && (
				<div className="flex-shrink-0">
					<Button
						onClick={onCreateTask}
						variant="primary"
						leftIcon={<Plus className="w-4 h-4" />}
					>
						Create Task
					</Button>
				</div>
			)}
		</div>
	);
}
