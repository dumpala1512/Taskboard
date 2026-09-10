import {
	Calendar,
	CheckCircle2,
	Clock,
	PlayCircle,
	Tag,
	Users,
} from "lucide-react";
import React from "react";

import type { Task } from "../../../server/types";

interface TaskSummaryProps {
	task: Task;
}

export function TaskSummary({ task }: TaskSummaryProps) {
	const formatDate = (dateStr?: string | null) => {
		if (!dateStr) return "Not set";
		return new Date(dateStr).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const getProgress = () => {
		if (typeof (task as any).progress === "number" && !isNaN((task as any).progress)) {
			return Math.min(100, Math.max(0, (task as any).progress));
		}
		switch (task.status) {
			case "DONE":
				return 100;
			case "REVIEW":
				return 75;
			case "IN_PROGRESS":
				return 50;
			case "TODO":
			case "BACKLOG":
			default:
				return 0;
		}
	};

	const progress = getProgress();

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			{/* Progress */}
			<div className="bg-white dark:bg-[#131B2E] p-4 rounded-lg border border-gray-100 dark:border-[#222F49] shadow-sm flex flex-col justify-center min-w-0">
				<div className="flex items-center text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
					<CheckCircle2 className="w-4 h-4 mr-1.5 text-green-500 shrink-0" />
					Progress
				</div>
				<div className="flex items-end justify-between gap-2">
					<span className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
						{`${progress}%`}
					</span>
					<span className="text-sm text-gray-500 dark:text-slate-400 truncate">Status: {task.status}</span>
				</div>
				<div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-3">
					<div
						className="bg-green-500 h-2 rounded-full transition-all duration-300"
						style={{
							width: `${progress}%`,
						}}
					></div>
				</div>
			</div>

			{/* Dates */}
			<div className="bg-white dark:bg-[#131B2E] p-4 rounded-lg border border-gray-100 dark:border-[#222F49] shadow-sm flex flex-col justify-center min-w-0">
				<div className="flex items-center text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
					<Calendar className="w-4 h-4 mr-1.5 text-orange-500 shrink-0" />
					Timeline
				</div>
				<div className="space-y-1 mt-1">
					<div className="flex justify-between text-sm">
						<span className="text-gray-500 dark:text-slate-400">Start:</span>
						<span className="font-medium text-gray-900 dark:text-slate-100">
							{formatDate(task.startDate)}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-gray-500 dark:text-slate-400">Due:</span>
						<span className="font-medium text-red-600 dark:text-red-400">
							{formatDate(task.dueDate)}
						</span>
					</div>
				</div>
			</div>

			{/* Tags */}
			<div className="bg-white dark:bg-[#131B2E] p-4 rounded-lg border border-gray-100 dark:border-[#222F49] shadow-sm flex flex-col justify-center space-y-3 min-w-0 overflow-hidden">
				<div className="min-w-0">
					<div className="flex items-center text-sm font-medium text-gray-500 dark:text-slate-400 mb-1.5">
						<Tag className="w-4 h-4 mr-1.5 text-purple-500 shrink-0" />
						Tags
					</div>
					<div className="flex flex-wrap gap-1.5 overflow-hidden">
						{task.tags && task.tags.length > 0 ? (
							task.tags.map((tag: string) => (
								<span
									key={tag}
									className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-[#1A233A] text-gray-600 dark:text-slate-300 break-all max-w-full inline-block"
									title={tag}
								>
									{tag}
								</span>
							))
						) : (
							<span className="text-xs text-gray-400 dark:text-slate-500">No tags</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
