import React, { useState, useMemo } from "react";
import type { User, Activity as ActivityItem } from "../../../server/types";
import {
	Clock,
	MessageSquare,
	Plus,
	Edit,
	CheckCircle2,
	Trash2,
	Activity as ActivityIcon,
	ArrowRight,
	Search,
	Filter,
	ArrowRightLeft,
} from "lucide-react";
import { EmptyState } from "../../ui/EmptyState";
import { Input } from "../../ui/Input";
import { useProjectActivities, type ActivityItem as HookActivityItem } from "../../../hooks/useActivities";

interface ActivityTabProps {
	projectId?: string;
	activities?: (ActivityItem | HookActivityItem)[];
	users: User[];
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; bg: string; text: string; border: string }
> = {
	BACKLOG: {
		label: "Backlog",
		bg: "bg-slate-100 dark:bg-slate-800",
		text: "text-slate-600 dark:text-slate-300",
		border: "border-slate-200 dark:border-slate-700",
	},
	TODO: {
		label: "To Do",
		bg: "bg-gray-100 dark:bg-gray-800",
		text: "text-gray-700 dark:text-gray-300",
		border: "border-gray-200 dark:border-gray-700",
	},
	IN_PROGRESS: {
		label: "In Progress",
		bg: "bg-blue-50 dark:bg-blue-950/60",
		text: "text-blue-600 dark:text-blue-400",
		border: "border-blue-200 dark:border-blue-800/60",
	},
	REVIEW: {
		label: "Review",
		bg: "bg-purple-50 dark:bg-purple-950/60",
		text: "text-purple-600 dark:text-purple-400",
		border: "border-purple-200 dark:border-purple-800/60",
	},
	DONE: {
		label: "Done",
		bg: "bg-emerald-50 dark:bg-emerald-950/60",
		text: "text-emerald-600 dark:text-emerald-400",
		border: "border-emerald-200 dark:border-emerald-800/60",
	},
};

function formatStatusName(status: string) {
	if (!status) return "";
	if (STATUS_CONFIG[status]) return STATUS_CONFIG[status].label;
	return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
	const cfg = STATUS_CONFIG[status] || {
		label: formatStatusName(status),
		bg: "bg-slate-100 dark:bg-slate-800",
		text: "text-slate-700 dark:text-slate-300",
		border: "border-slate-200 dark:border-slate-700",
	};

	return (
		<span
			className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}
		>
			{cfg.label}
		</span>
	);
}

const getActionIcon = (type: string) => {
	switch (type) {
		case "TASK_STATUS_CHANGED":
			return <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />;
		case "TASK_CREATED":
		case "PROJECT_CREATED":
			return <Plus className="w-3.5 h-3.5 text-emerald-500" />;
		case "TASK_COMPLETED":
			return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
		case "TASK_DELETED":
			return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
		case "TASK_UPDATED":
		case "PROJECT_UPDATED":
			return <Edit className="w-3.5 h-3.5 text-amber-500" />;
		case "MEMBER_ASSIGNED":
			return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
		default:
			return <Clock className="w-3.5 h-3.5 text-slate-400" />;
	}
};

export default function ActivityTab({
	projectId,
	activities: initialActivities,
	users,
}: ActivityTabProps) {
	const { data: fetchedActivities, isLoading } = useProjectActivities(projectId);
	const rawActivities = initialActivities || fetchedActivities || [];

	const [filterType, setFilterType] = useState<"ALL" | "TRANSITIONS" | "UPDATES">("ALL");
	const [searchQuery, setSearchQuery] = useState("");

	const sortedActivities = useMemo(() => {
		return [...rawActivities].sort((a: any, b: any) => {
			const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
			const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
			return dateB - dateA;
		});
	}, [rawActivities]);

	const filteredActivities = useMemo(() => {
		return sortedActivities.filter((activity: any) => {
			if (filterType === "TRANSITIONS") {
				if (activity.type !== "TASK_STATUS_CHANGED" && activity.type !== "TASK_COMPLETED") {
					return false;
				}
			} else if (filterType === "UPDATES") {
				if (activity.type === "TASK_STATUS_CHANGED") {
					return false;
				}
			}

			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const detailsMatch = (activity.details || activity.target || "").toLowerCase().includes(query);
				const titleMatch = (activity.taskTitle || "").toLowerCase().includes(query);
				const userMatch = (
					typeof activity.user === "object" ? activity.user.name : ""
				).toLowerCase().includes(query);
				return detailsMatch || titleMatch || userMatch;
			}

			return true;
		});
	}, [sortedActivities, filterType, searchQuery]);

	return (
		<div className="w-full bg-white dark:bg-[#131B2E] rounded-lg border border-[#E0E3E8] dark:border-[#222F49] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
			{/* Header & Filter Controls */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E0E3E8] dark:border-[#222F49]">
				<div>
					<h3 className="text-base font-semibold text-[#33475B] dark:text-slate-100 flex items-center gap-2">
						<ActivityIcon className="w-4 h-4 text-indigo-500" />
						Project Activities
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						Track task transitions, status changes, and team activities in real-time.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="relative w-full sm:w-56">
						<Input
							placeholder="Search activities..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8 text-xs h-8 bg-slate-50 dark:bg-[#1A233A] border-[#E0E3E8] dark:border-[#222F49] text-slate-900 dark:text-slate-100"
						/>
						<Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
					</div>

					<div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A233A] p-0.5 rounded-lg border border-[#E0E3E8] dark:border-[#222F49]">
						<button
							onClick={() => setFilterType("ALL")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
								filterType === "ALL"
									? "bg-white dark:bg-[#222F49] text-indigo-600 dark:text-indigo-400 shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							All ({sortedActivities.length})
						</button>
						<button
							onClick={() => setFilterType("TRANSITIONS")}
							className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
								filterType === "TRANSITIONS"
									? "bg-white dark:bg-[#222F49] text-indigo-600 dark:text-indigo-400 shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							Transitions
						</button>
					</div>
				</div>
			</div>

			{/* Timeline */}
			<div className="relative border-l border-slate-200 dark:border-[#222F49] ml-3.5 space-y-6 pt-2">
				{filteredActivities.map((activity: any) => {
					const user =
						activity.user && typeof activity.user === "object"
							? activity.user
							: users.find((u) => u.id === activity.userId);
					const userName = user?.name || "Unknown User";
					const userAvatar = user?.avatar;

					const isTransition =
						activity.type === "TASK_STATUS_CHANGED" ||
						(activity.fromStatus && activity.toStatus);

					const timestamp = activity.createdAt || activity.timestamp;
					const formattedTime = timestamp
						? new Date(timestamp).toLocaleString(undefined, {
								month: "short",
								day: "numeric",
								hour: "2-digit",
								minute: "2-digit",
						  })
						: "";

					return (
						<div key={activity.id} className="relative pl-6 group">
							{/* Timeline Icon Node */}
							<div className="absolute -left-3.5 top-0.5 w-7 h-7 bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#222F49] rounded-full flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] group-hover:border-indigo-400 transition-colors">
								{getActionIcon(activity.type)}
							</div>

							<div className="bg-slate-50/70 dark:bg-[#1A233A]/60 rounded-lg p-3 border border-slate-200/80 dark:border-[#222F49] hover:bg-slate-50 dark:hover:bg-[#1A233A] transition-colors">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
									<div className="flex items-center gap-2 flex-wrap">
										{userAvatar ? (
											<img
												src={userAvatar}
												alt={userName}
												className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-[#222F49]"
											/>
										) : (
											<div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
												{userName.charAt(0).toUpperCase()}
											</div>
										)}
										<span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
											{userName}
										</span>

										{isTransition ? (
											<span className="text-xs text-slate-500 dark:text-slate-400">
												moved task
											</span>
										) : (
											<span className="text-xs text-slate-500 dark:text-slate-400">
												{activity.type.replace(/_/g, " ").toLowerCase()}
											</span>
										)}

										{activity.taskTitle && (
											<span className="text-sm font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-[#131B2E] px-2 py-0.5 rounded border border-slate-200 dark:border-[#222F49]">
												{activity.taskTitle}
											</span>
										)}
									</div>

									{formattedTime && (
										<div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
											<Clock className="w-3 h-3" />
											{formattedTime}
										</div>
									)}
								</div>

								{/* Status Transition Visual Badges */}
								{isTransition && activity.fromStatus && activity.toStatus ? (
									<div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-[#222F49]/60">
										<span className="text-xs text-slate-500 dark:text-slate-400">
											Transition:
										</span>
										<StatusBadge status={activity.fromStatus} />
										<ArrowRight className="w-3.5 h-3.5 text-slate-400" />
										<StatusBadge status={activity.toStatus} />
									</div>
								) : (
									activity.details &&
									activity.details !== activity.taskTitle && (
										<p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
											{activity.details}
										</p>
									)
								)}
							</div>
						</div>
					);
				})}

				{filteredActivities.length === 0 && !isLoading && (
					<div className="py-8">
						<EmptyState
							icon={ActivityIcon}
							title="No Activities Found"
							description={
								searchQuery
									? `No activities match "${searchQuery}". Try a different search.`
									: filterType === "TRANSITIONS"
									? "No task transitions recorded yet. Move tasks on the Kanban board to track workflow progression."
									: "Activities will appear here when team members interact with project tasks."
							}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
