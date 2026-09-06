import {
	Activity,
	AlertCircle,
	CheckCircle2,
	ListTodo,
	Users,
} from "lucide-react";
import React from "react";
import type { Project, Task } from "../../../server/types";

interface OverviewCardsProps {
	project: Project;
	tasks: Task[];
}

export default function OverviewCards({ project, tasks }: OverviewCardsProps) {
	const totalTasks = tasks.length;
	const completedTasks = tasks.filter((t) => t.status === "DONE").length;
	const inProgressTasks = tasks.filter(
		(t) => t.status === "IN_PROGRESS" || t.status === "REVIEW",
	).length;

	const overdueTasks = tasks.filter((t) => {
		if (t.status === "DONE" || !t.dueDate) return false;
		return new Date(t.dueDate) < new Date();
	}).length;

	const completionPercentage =
		totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

	const metrics = [
		{
			label: "Total Tasks",
			value: totalTasks,
			icon: ListTodo,
			color: "#1E88E5",
			bg: "#E3F2FD",
		},
		{
			label: "Completed",
			value: completedTasks,
			icon: CheckCircle2,
			color: "#43A047",
			bg: "#E8F5E9",
		},
		{
			label: "In Progress",
			value: inProgressTasks,
			icon: Activity,
			color: "#2196F3",
			bg: "#E3F2FD",
		},
		{
			label: "Overdue",
			value: overdueTasks,
			icon: AlertCircle,
			color: overdueTasks > 0 ? "#E53935" : "#9EAAB7",
			bg: overdueTasks > 0 ? "#FFEBEE" : "#F5F6F8",
			isWarning: overdueTasks > 0,
		},
		{
			label: "Team Members",
			value: project.members?.length || 0,
			icon: Users,
			color: "#26A69A",
			bg: "#E0F2F1",
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
			{metrics.map((metric, index) => {
				const Icon = metric.icon;
				return (
					<div
						key={index}
						className={`p-4 rounded-md border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
							metric.isWarning ? "border-[#EF9A9A]" : "border-[#E0E3E8]"
						}`}
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-[#6E7B8B] uppercase tracking-wide">
									{metric.label}
								</p>
								<p
									className={`text-3xl font-bold mt-1 leading-none ${metric.isWarning ? "text-[#E53935]" : "text-[#33475B]"}`}
								>
									{metric.value}
								</p>
							</div>
							<div
								className="p-2 rounded flex-shrink-0"
								style={{ background: metric.bg }}
							>
								<Icon className="w-4 h-4" style={{ color: metric.color }} />
							</div>
						</div>

						{/* Progress bar for Completed */}
						{metric.label === "Completed" && (
							<div className="mt-2.5 w-full bg-[#F0F2F5] rounded-full h-1">
								<div
									className="bg-[#43A047] h-1 rounded-full transition-all duration-500"
									style={{ width: `${completionPercentage}%` }}
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
