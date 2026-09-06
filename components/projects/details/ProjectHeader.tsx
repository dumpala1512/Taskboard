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
	{ label: string; color: string; bg: string }
> = {
	ACTIVE: { label: "Active", color: "#43A047", bg: "#E8F5E9" },
	ON_HOLD: { label: "On Hold", color: "#FB8C00", bg: "#FFF3E0" },
	PLANNING: { label: "Planning", color: "#2196F3", bg: "#E3F2FD" },
	COMPLETED: { label: "Completed", color: "#9E9E9E", bg: "#F5F5F5" },
};

export default function ProjectHeader({
	project,
	onCreateTask,
}: ProjectHeaderProps) {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";

	const sCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PLANNING;

	return (
		<div className="bg-white rounded-md border border-[#E0E3E8] px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
			<div>
				<div className="flex items-center gap-2 mb-1.5">
					<span className="text-xs font-semibold text-[#6E7B8B] bg-[#F5F6F8] border border-[#E0E3E8] px-2 py-0.5 rounded-sm">
						{project.key}
					</span>
					<span
						className="text-xs font-semibold px-2 py-0.5 rounded-sm"
						style={{ color: sCfg.color, background: sCfg.bg }}
					>
						{sCfg.label}
					</span>
				</div>

				<h1 className="text-2xl font-semibold text-[#33475B] break-words leading-snug">
					{project.name}
				</h1>

				<div className="flex items-center gap-5 mt-2 text-xs text-[#6E7B8B]">
					<div className="flex items-center gap-1.5">
						<Calendar className="w-3.5 h-3.5 text-[#9EAAB7]" />
						<span>
							{(project.startDate ? new Date(project.startDate) : new Date(project.createdAt)).toLocaleDateString()} —{" "}
							{project.dueDate
								? new Date(project.dueDate).toLocaleDateString()
								: "Ongoing"}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Users className="w-3.5 h-3.5 text-[#9EAAB7]" />
						<span>{project.members?.length || 0} Members</span>
					</div>
				</div>
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
