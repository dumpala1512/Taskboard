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

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			{/* Progress */}
			<div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center min-w-0">
				<div className="flex items-center text-sm font-medium text-gray-500 mb-2">
					<CheckCircle2 className="w-4 h-4 mr-1.5 text-green-500 shrink-0" />
					Progress
				</div>
				<div className="flex items-end justify-between gap-2">
					<span className="text-2xl font-semibold text-gray-900">
						{task.status === "DONE"
							? "100%"
							: task.status === "IN_PROGRESS"
								? "50%"
								: "0%"}
					</span>
					<span className="text-sm text-gray-500 truncate">Status: {task.status}</span>
				</div>
				<div className="w-full bg-gray-200 rounded-full h-2 mt-3">
					<div
						className="bg-green-500 h-2 rounded-full"
						style={{
							width:
								task.status === "DONE"
									? "100%"
									: task.status === "IN_PROGRESS"
										? "50%"
										: "0%",
						}}
					></div>
				</div>
			</div>

			{/* Dates */}
			<div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center min-w-0">
				<div className="flex items-center text-sm font-medium text-gray-500 mb-2">
					<Calendar className="w-4 h-4 mr-1.5 text-orange-500 shrink-0" />
					Timeline
				</div>
				<div className="space-y-1 mt-1">
					<div className="flex justify-between text-sm">
						<span className="text-gray-500">Start:</span>
						<span className="font-medium text-gray-900">
							{formatDate(task.startDate)}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-gray-500">Due:</span>
						<span className="font-medium text-red-600">
							{formatDate(task.dueDate)}
						</span>
					</div>
				</div>
			</div>

			{/* Tags */}
			<div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center space-y-3 min-w-0 overflow-hidden">
				<div className="min-w-0">
					<div className="flex items-center text-sm font-medium text-gray-500 mb-1.5">
						<Tag className="w-4 h-4 mr-1.5 text-purple-500 shrink-0" />
						Tags
					</div>
					<div className="flex flex-wrap gap-1.5 overflow-hidden">
						{task.tags && task.tags.length > 0 ? (
							task.tags.map((tag: string) => (
								<span
									key={tag}
									className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 break-all max-w-full inline-block"
									title={tag}
								>
									{tag}
								</span>
							))
						) : (
							<span className="text-xs text-gray-400">No tags</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
