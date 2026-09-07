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
			darkBg: "rgba(56, 189, 248, 0.15)",
			darkColor: "#38BDF8",
		},
		{
			label: "Completed",
			value: completedTasks,
			icon: CheckCircle2,
			color: "#43A047",
			bg: "#E8F5E9",
			darkBg: "rgba(74, 222, 128, 0.15)",
			darkColor: "#4ADE80",
		},
		{
			label: "In Progress",
			value: inProgressTasks,
			icon: Activity,
			color: "#2196F3",
			bg: "#E3F2FD",
			darkBg: "rgba(56, 189, 248, 0.15)",
			darkColor: "#38BDF8",
		},
		{
			label: "Overdue",
			value: overdueTasks,
			icon: AlertCircle,
			color: overdueTasks > 0 ? "#E53935" : "#9EAAB7",
			bg: overdueTasks > 0 ? "#FFEBEE" : "#F5F6F8",
			darkBg: overdueTasks > 0 ? "rgba(248, 113, 113, 0.15)" : "#1A233A",
			darkColor: overdueTasks > 0 ? "#F87171" : "#94A3B8",
			isWarning: overdueTasks > 0,
		},
		{
			label: "Team Members",
			value: project.members?.length || 0,
			icon: Users,
			color: "#26A69A",
			bg: "#E0F2F1",
			darkBg: "rgba(45, 212, 191, 0.15)",
			darkColor: "#2DD4BF",
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
			{metrics.map((metric, index) => {
				const Icon = metric.icon;
				return (
					<div
						key={index}
						className={`p-4 rounded-md border bg-white dark:bg-[#131B2E] shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
							metric.isWarning
								? "border-[#EF9A9A] dark:border-red-900/50"
								: "border-[#E0E3E8] dark:border-[#222F49]"
						}`}
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-[#6E7B8B] dark:text-slate-400 uppercase tracking-wide">
									{metric.label}
								</p>
								<p
									className={`text-3xl font-bold mt-1 leading-none ${
										metric.isWarning
											? "text-[#E53935] dark:text-red-400"
											: "text-[#33475B] dark:text-slate-100"
									}`}
								>
									{metric.value}
								</p>
							</div>
							<div
								className="p-2 rounded flex-shrink-0"
								style={{
									background: metric.bg,
								}}
							>
								<Icon className="w-4 h-4" style={{ color: metric.color }} />
							</div>
						</div>

						{/* Progress bar for Completed */}
						{metric.label === "Completed" && (
							<div className="mt-2.5 w-full bg-[#F0F2F5] dark:bg-[#1A233A] rounded-full h-1 overflow-hidden">
								<div
									className="bg-[#43A047] dark:bg-emerald-500 h-1 rounded-full transition-all duration-500"
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
