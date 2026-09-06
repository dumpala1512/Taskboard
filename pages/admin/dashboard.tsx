import React, { useState } from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { AppLayout } from "../../components/layout/AppLayout";
import { useTasks } from "../../hooks/useTasks";
import { ChevronDown } from "lucide-react";
import { useUsers } from "../../hooks/useUsers";

export default function Overview() {
	const { data: session } = useSession();
	const { data: tasks, isLoading: tasksLoading } = useTasks();
	const { data: users } = useUsers();
	
	const safeUsers = users || [];
	const role = (session?.user as any)?.role || "MEMBER";
	const isAdmin = role === "ADMIN";
	const userId = (session?.user as any)?.id;

	const [view, setView] = useState<"assigned" | "all">("assigned");

	const safeTasks: any[] = tasks || [];
	
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

			<div className="flex flex-col h-full bg-[#FAFBFC]">
				<div className="flex-1 overflow-auto p-8">
					<div className="max-w-[1200px] mx-auto space-y-8">
						
						{/* Header */}
						<div className="flex justify-between items-center">
							<h1 className="text-5xl font-bold text-gray-900">Dashboard</h1>
						</div>

						{/* Metric Cards */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
								<h3 className="text-sm font-medium text-slate-500 mb-2">Tasks Assigned</h3>
								<div className="text-4xl font-bold text-slate-900 leading-none">
									{tasksLoading ? "--" : formatNumber(filteredTasks.length)}
								</div>
							</div>
							
							<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
								<h3 className="text-sm font-medium text-slate-500 mb-2">In Progress</h3>
								<div className="text-4xl font-bold text-slate-900 leading-none">
									{tasksLoading ? "--" : formatNumber(inProgressTasks.length)}
								</div>
							</div>

							<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
								<h3 className="text-sm font-medium text-slate-500 mb-2">Tasks Completed</h3>
								<div className="text-4xl font-bold text-slate-900 leading-none">
									{tasksLoading ? "--" : formatNumber(completedTasks.length)}
								</div>
							</div>
						</div>

						{/* Assigned Tasks Table */}
						<div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
							<div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
								<h2 className="text-lg font-bold text-slate-800">
									{view === "assigned" ? (isAdmin ? "Assigned Tasks" : "My Tasks") : "All Tasks"}
								</h2>
								<div className="relative">
									<select 
										value={view}
										onChange={(e) => setView(e.target.value as "assigned" | "all")}
										className="appearance-none bg-[#F5F5F5] border border-gray-200 text-gray-600 py-1 pl-3 pr-8 rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gray-400"
									>
										<option value="assigned">{isAdmin ? "Assigned Tasks" : "My Tasks"}</option>
										<option value="all">All Tasks</option>
									</select>
									<ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1.5 pointer-events-none" />
								</div>
							</div>
							
							<div className="overflow-x-auto">
								<table className="w-full text-left border-collapse">
									<thead>
										<tr className="bg-[#F5F5F5] border-b border-gray-200 text-sm font-bold text-[#333333]">
											<th className="px-6 py-3 whitespace-nowrap">ID</th>
											<th className="px-6 py-3 whitespace-nowrap">Task Name</th>
											<th className="px-6 py-3 whitespace-nowrap">Start Date</th>
											<th className="px-6 py-3 whitespace-nowrap">Priority</th>
											<th className="px-6 py-3 whitespace-nowrap">Status</th>
											<th className="px-6 py-3 whitespace-nowrap">Assigned To</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{tasksLoading ? (
											<tr>
												<td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
													Loading tasks...
												</td>
											</tr>
										) : filteredTasks.length === 0 ? (
											<tr>
												<td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
													No tasks found.
												</td>
											</tr>
										) : (
											filteredTasks.map((task, index) => {
												let statusClass = "text-gray-500 border-gray-300";
												let statusLabel = task.status;
												
												if (task.status === "DONE") {
													statusClass = "text-gray-400 border-gray-300";
													statusLabel = "Done";
												} else if (task.status === "IN_PROGRESS") {
													statusClass = "text-gray-400 border-gray-300";
													statusLabel = "In Progress";
												} else if (task.status === "TODO") {
													statusClass = "text-gray-400 border-gray-300";
													statusLabel = "To Do";
												} else if (task.status === "REVIEW") {
													statusClass = "text-gray-400 border-gray-300";
													statusLabel = "In Review";
												}

												let priorityLabel = task.priority.charAt(0) + task.priority.slice(1).toLowerCase();
												
												const assigneeName = task.assigneeId 
													? safeUsers.find((u: any) => u.id === task.assigneeId)?.name || "Assigned"
													: "Unassigned";

												return (
													<tr key={task.id} className="text-base text-[#333333] hover:bg-gray-50 transition-colors">
														<td className="px-6 py-4 whitespace-nowrap text-gray-600" title={task.id}>
															{task.id.split('-')[0].toUpperCase()}
														</td>
														<td className="px-6 py-4 text-gray-600">{task.title}</td>
														<td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(task.startDate || task.createdAt)}</td>
														<td className="px-6 py-4 whitespace-nowrap text-gray-600">{priorityLabel}</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-xs font-medium ${statusClass}`}>
																{statusLabel}
															</span>
														</td>
														<td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">{assigneeName}</td>
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
