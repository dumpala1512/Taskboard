// Dashboard Overview
import React, { useState } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { AppLayout } from "../../components/layout/AppLayout";
import { useTasks } from "../../hooks/useTasks";
import { ChevronDown, ListTodo } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useUsers } from "../../hooks/useUsers";
import { Skeleton } from "../../components/ui/Skeleton";
import { useProjects } from "../../hooks/useProjects";

export default function Overview() {
	const { data: session } = useSession();
	const { data: tasks, isLoading: tasksLoading } = useTasks();
	const { data: users } = useUsers();
	const { data: projects = [] } = useProjects();
	
	const safeUsers = users || [];
	const role = (session?.user as any)?.role || "MEMBER";
	const isAdmin = role === "ADMIN";
	const userId = (session?.user as any)?.id;

	const [view, setView] = useState<"assigned" | "all">("assigned");

	const validProjectIds = React.useMemo(() => {
		const set = new Set<string>();
		projects.forEach((p) => {
			if (p.id) set.add(p.id.toLowerCase());
			if (p.key) set.add(p.key.toLowerCase());
		});
		return set;
	}, [projects]);

	const safeTasks: any[] = (tasks || []).filter(
		(t) => t.projectId && (validProjectIds.size === 0 || validProjectIds.has(t.projectId.toLowerCase()))
	);
	
	// Filter tasks based on view
	const filteredTasks = view === "assigned" 
		? (isAdmin ? safeTasks.filter(t => t.assignees?.length > 0 || t.assigneeId) : safeTasks.filter(t => t.assignees?.includes(userId) || t.assigneeId === userId))
		: safeTasks;

	const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "REVIEW");
	const completedTasks = filteredTasks.filter((t) => t.status === "DONE");

	const formatDate = (dateString?: string) => {
		if (!dateString) return "—";
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatNumber = (num: number) => {
		return num.toString();
	};

	return (
		<AppLayout>
			<Head>
				<title>Dashboard | Projects Workspace</title>
			</Head>

			<div className="flex flex-col h-full bg-[#FAFBFC] dark:bg-slate-950">
				<div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
					<div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8">
						
						{/* Header */}
						<div className="flex justify-between items-center pt-1 sm:pt-0">
							<h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
						</div>

						{/* Metric Cards */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
							<div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
								<h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 sm:mb-2">Tasks Assigned</h3>
								<div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-none">
									{tasksLoading ? <Skeleton className="h-8 sm:h-10 w-16 inline-block" /> : formatNumber(filteredTasks.length)}
								</div>
							</div>
							
							<div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
								<h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 sm:mb-2">In Progress</h3>
								<div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-none">
									{tasksLoading ? <Skeleton className="h-8 sm:h-10 w-16 inline-block" /> : formatNumber(inProgressTasks.length)}
								</div>
							</div>

							<div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
								<h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 sm:mb-2">Tasks Completed</h3>
								<div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-none">
									{tasksLoading ? <Skeleton className="h-8 sm:h-10 w-16 inline-block" /> : formatNumber(completedTasks.length)}
								</div>
							</div>
						</div>

						{/* Assigned Tasks Table */}
						<div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
							<div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white whitespace-nowrap">
									{view === "assigned" ? (isAdmin ? "Assigned Tasks" : "My Tasks") : "All Tasks"}
								</h2>
								<div className="relative self-start sm:self-auto">
									<select 
										value={view}
										onChange={(e) => setView(e.target.value as "assigned" | "all")}
										className="appearance-none bg-[#F5F5F5] dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 py-1.5 pl-3 pr-8 rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-slate-600"
									>
										<option value="assigned" className="dark:bg-slate-800 dark:text-slate-200">{isAdmin ? "Assigned Tasks" : "My Tasks"}</option>
										<option value="all" className="dark:bg-slate-800 dark:text-slate-200">All Tasks</option>
									</select>
									<ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-300 absolute right-2.5 top-2 pointer-events-none" />
								</div>
							</div>
							
							<div className="overflow-x-auto">
								<table className="min-w-[640px] w-full text-left border-collapse">
									<thead>
										<tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
											<th className="px-4 py-3 sm:px-6 whitespace-nowrap text-slate-800 dark:text-slate-100">ID</th>
											<th className="px-4 py-3 sm:px-6 whitespace-nowrap text-slate-800 dark:text-slate-100">Task Name</th>
											<th className="px-4 py-3 sm:px-6 whitespace-nowrap text-slate-800 dark:text-slate-100">Start Date</th>
											<th className="px-4 py-3 sm:px-6 whitespace-nowrap text-slate-800 dark:text-slate-100">Priority</th>
											<th className="px-4 py-3 sm:px-6 whitespace-nowrap text-slate-800 dark:text-slate-100">Status</th>
											<th className="px-4 py-3 sm:px-6 whitespace-nowrap text-slate-800 dark:text-slate-100">Assigned To</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 dark:divide-slate-800">
										{tasksLoading ? (
											[...Array(5)].map((_, i) => (
												<tr key={`skeleton-${i}`}>
													<td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
													<td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
													<td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
													<td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
													<td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
													<td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
												</tr>
											))
										) : filteredTasks.length === 0 ? (
											<tr>
												<td colSpan={6} className="p-0 border-b-0">
													<EmptyState 
														icon={ListTodo}
														title="No tasks found"
														description="You don't have any tasks matching this view yet."
													/>
												</td>
											</tr>
										) : (
											filteredTasks.map((task, index) => {
												let statusClass = "text-gray-500 border-gray-300 dark:text-slate-400 dark:border-slate-600";
												let statusLabel = task.status;
												
												if (task.status === "DONE") {
													statusClass = "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30";
													statusLabel = "Done";
												} else if (task.status === "IN_PROGRESS") {
													statusClass = "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30";
													statusLabel = "In Progress";
												} else if (task.status === "TODO") {
													statusClass = "text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30";
													statusLabel = "To Do";
												} else if (task.status === "REVIEW") {
													statusClass = "text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30";
													statusLabel = "In Review";
												}

												let priorityLabel = task.priority.charAt(0) + task.priority.slice(1).toLowerCase();
												
												const assigneeName = task.assigneeId 
													? safeUsers.find((u: any) => u.id === task.assigneeId)?.name || "Assigned"
													: "Unassigned";

												return (
													<tr key={task.id} className="text-base text-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
														<td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300" title={task.id}>
															{task.id.split('-')[0].toUpperCase()}
														</td>
														<td className="px-6 py-4 text-gray-800 dark:text-slate-200 font-medium">{task.title}</td>
														<td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300">{formatDate(task.startDate || task.createdAt)}</td>
														<td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300">{priorityLabel}</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-xs font-medium ${statusClass}`}>
																{statusLabel}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300 font-medium">{assigneeName}</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>

					</div>
				</div>
			</div>
		</AppLayout>
	);
}
