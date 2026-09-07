import { Clock } from "lucide-react";
import React from "react";
import type { Project, Task } from "../../../server/types";

interface OverviewTabProps {
	project: Project;
	tasks: Task[];
}

export default function OverviewTab({ project, tasks }: OverviewTabProps) {
	const upcomingDeadlines = tasks
		.filter((t) => t.dueDate && t.status !== "DONE")
		.sort(
			(a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
		)
		.slice(0, 5);

	return (
		<div className="space-y-5">
			<div className="space-y-5">
				<div className="bg-white dark:bg-[#131B2E] rounded-md border border-[#E0E3E8] dark:border-[#222F49] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
					<h3 className="text-base font-semibold text-[#33475B] dark:text-slate-100 mb-3">
						Project Description
					</h3>
					<p className="text-sm text-[#6E7B8B] dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
						{project.description}
					</p>
				</div>
			</div>

			<div className="space-y-5">
				<div className="bg-white dark:bg-[#131B2E] rounded-md border border-[#E0E3E8] dark:border-[#222F49] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
					<div className="mb-3">
						<h3 className="text-xs font-semibold uppercase tracking-wider text-[#6E7B8B] dark:text-slate-400">
							Upcoming Deadlines
						</h3>
					</div>
					<div className="space-y-3">
						{upcomingDeadlines.length === 0 ? (
							<p className="text-sm text-[#9EAAB7] dark:text-slate-500">No upcoming deadlines.</p>
						) : (
							upcomingDeadlines.map((task) => (
								<div
									key={task.id}
									className="flex flex-col border-l-2 border-[#1E88E5] dark:border-sky-500 pl-3"
								>
									<span className="text-sm font-medium text-[#33475B] dark:text-slate-100 truncate block">
										{task.title}
									</span>
									<div className="flex items-center mt-0.5 text-xs text-[#9EAAB7] dark:text-slate-400 gap-1">
										<Clock className="w-3 h-3" />
										<span>
											Due {new Date(task.dueDate!).toLocaleDateString()}
										</span>
										<span>•</span>
										<span className="capitalize">
											{task.status.replace("_", " ")}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
