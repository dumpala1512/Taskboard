import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateProject } from "../../../hooks/useProjects";
import { useUpdateTask } from "../../../hooks/useTasks";
import type { Project, Task, TaskStatus, User } from "../../../server/types";
import { TaskDetailsPanel } from "../../tasks/details/TaskDetailsPanel";
import { TaskWizardModal } from "../../tasks/TaskWizardModal";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Portal } from "../../ui/Portal";
import KanbanColumn from "./KanbanColumn";

interface KanbanBoardProps {
	tasks: Task[];
	users: User[];
	project?: Project;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
	{ id: "TODO", title: "To Do" },
	{ id: "IN_PROGRESS", title: "In Progress" },
	{ id: "REVIEW", title: "Review" },
	{ id: "DONE", title: "Done" },
];

export default function KanbanBoard({
	tasks: initialTasks,
	users,
	project,
}: KanbanBoardProps) {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";
	const currentUser = users.find((u) => u.email === session?.user?.email);
	const { mutate: updateProject } = useUpdateProject();
	const queryClient = useQueryClient();
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

	const { mutate: updateTask } = useUpdateTask();

	const [isAddingColumn, setIsAddingColumn] = useState(false);
	const [newColumnName, setNewColumnName] = useState("");
	const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
	const [deleteConfirmationChecked, setDeleteConfirmationChecked] =
		useState(false);

	const boardColumns = (project?.columns?.length ? project.columns : COLUMNS).filter(
		(c) => c.id !== "BACKLOG"
	);

	// Sync state if initial tasks update from backend
	useEffect(() => {
		setTasks(initialTasks);
	}, [initialTasks]);

	const handleAddColumn = () => {
		const trimmed = newColumnName.trim();
		if (!trimmed || trimmed.length < 2 || trimmed.length > 30 || !project) return;
		if (trimmed.toUpperCase() === "BACKLOG") {
			toast.error("Backlog is managed in the dedicated Backlog tab");
			return;
		}
		if (
			boardColumns.some(
				(c) =>
					c.title.toLowerCase() === trimmed.toLowerCase() ||
					c.id.toLowerCase() === trimmed.toUpperCase().replace(/\s+/g, "_").toLowerCase()
			)
		) {
			toast.error("Column with this name already exists");
			return;
		}
		const newCol = {
			id: trimmed.toUpperCase().replace(/\s+/g, "_"),
			title: trimmed,
		};
		const updatedColumns = [...boardColumns, newCol];
		updateProject({ id: project.id, columns: updatedColumns });
		setNewColumnName("");
		setIsAddingColumn(false);
	};

	const confirmDeleteColumn = (colId: string) => {
		setColumnToDelete(colId);
		setDeleteConfirmationChecked(false);
	};

	const executeDeleteColumn = async () => {
		if (!project || !columnToDelete) return;
		try {
			const res = await fetch(`/api/projects/${project.id}/columns/${columnToDelete}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Failed to delete column");
			}
			
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["tasks", project.id] });
			
			setColumnToDelete(null);
			toast.success("Column deleted and tasks moved to Backlog");
		} catch (error: any) {
			toast.error(error.message || "Failed to delete column");
		}
	};

	// Handle hydratation mismatch with DragDropContext
	const [isBrowser, setIsBrowser] = useState(false);
	useEffect(() => {
		setIsBrowser(true);
	}, []);

	const onDragEnd = (result: DropResult) => {
		const { destination, source, draggableId } = result;

		if (!destination) return;
		if (
			destination.droppableId === source.droppableId &&
			destination.index === source.index
		)
			return;

		// Find the task
		const taskIndex = tasks.findIndex((t) => t.id === draggableId);
		if (taskIndex === -1) return;

		const task = tasks[taskIndex];

		if (!isAdmin && task.assigneeId !== currentUser?.id) {
			toast.error("You can only move tasks assigned to you");
			return;
		}

		const newStatus = destination.droppableId as TaskStatus;

		// Create a new array and update status
		const newTasks = [...tasks];
		newTasks[taskIndex] = { ...task, status: newStatus };
		setTasks(newTasks);

		// Trigger an API call here to persist the new status
		updateTask(
			{ id: task.id, status: newStatus },
			{
				onSuccess: () => toast.success("Task status updated"),
				onError: () => toast.error("Failed to update task status"),
			},
		);
	};

	const [filterStatus, setFilterStatus] = useState("");
	const [filterPriority, setFilterPriority] = useState("");
	const [filterAssignee, setFilterAssignee] = useState("");
	const [filterOnlyMe, setFilterOnlyMe] = useState(false);

	const filteredTasks = tasks.filter((t) => {
		const matchesSearch =
			t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			t.tags.some((tag) =>
				tag.toLowerCase().includes(searchQuery.toLowerCase()),
			);
		const matchesStatus = filterStatus ? t.status === filterStatus : true;
		const matchesPriority = filterPriority
			? t.priority === filterPriority
			: true;
		const matchesAssignee = filterAssignee
			? t.assigneeId === filterAssignee
			: true;
		const matchesOnlyMe = filterOnlyMe
			? t.assigneeId === currentUser?.id
			: true;

		return (
			matchesSearch &&
			matchesStatus &&
			matchesPriority &&
			matchesAssignee &&
			matchesOnlyMe
		);
	});

	if (!isBrowser) return null; // Avoid SSR hydration error with dnd

	return (
		<div className="flex flex-col h-full bg-white rounded-lg border border-[#E0E3E8] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
			{/* Board Toolbar */}
			<div className="px-4 py-3 border-b border-[#E0E3E8] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-white">
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto">
					<div className="relative w-full sm:w-64 shrink-0">
						<Input
							placeholder="Search tasks..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 text-sm h-9 border-[#E0E3E8] bg-[#F5F6F8] focus:bg-white w-full"
						/>
						<Search className="w-3.5 h-3.5 text-[#9EAAB7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
					</div>

					<div className="flex items-center gap-2 text-sm text-slate-500 font-medium shrink-0">
						<Filter className="w-4 h-4 text-indigo-500" /> Filters:
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<select
							className="h-9 px-3 text-sm bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
						>
							<option value="">Status: All Statuses</option>
							{boardColumns.map((c) => (
								<option key={c.id} value={c.id}>
									{c.title}
								</option>
							))}
						</select>

						<select
							className="h-9 px-3 text-sm bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
							value={filterPriority}
							onChange={(e) => setFilterPriority(e.target.value)}
						>
							<option value="">Priority: All Priorities</option>
							<option value="LOW">Low</option>
							<option value="MEDIUM">Medium</option>
							<option value="HIGH">High</option>
						</select>

						<select
							className="h-9 px-3 text-sm bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
							value={filterAssignee}
							onChange={(e) => setFilterAssignee(e.target.value)}
						>
							<option value="">Assignee: All Assignees</option>
							{users.map((u) => (
								<option key={u.id} value={u.id}>
									{u.name}
								</option>
							))}
						</select>

						<label className="flex items-center gap-2 h-9 px-4 bg-white border border-slate-200 rounded-full cursor-pointer hover:bg-slate-50 transition-colors">
							<span className="text-sm text-slate-700">Only Me</span>
							<div
								className={`w-8 h-4 rounded-full transition-colors relative ${filterOnlyMe ? "bg-indigo-500" : "bg-slate-200"}`}
							>
								<div
									className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${filterOnlyMe ? "translate-x-4" : ""}`}
								/>
							</div>
							<input
								type="checkbox"
								className="sr-only"
								checked={filterOnlyMe}
								onChange={(e) => setFilterOnlyMe(e.target.checked)}
							/>
						</label>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{isAdmin && (
						<Button
							variant="outline"
							size="sm"
							className="h-9"
							onClick={() => {
								setNewColumnName("");
								setIsAddingColumn(true);
							}}
						>
							+ Add Column
						</Button>
					)}
				</div>
			</div>

			{/* Add Column Modal */}
			{isAddingColumn && isAdmin && (() => {
				const trimmedColName = newColumnName.trim();
				const isColumnNameEmpty = trimmedColName.length === 0;
				const isColumnNameTooShort = trimmedColName.length > 0 && trimmedColName.length < 2;
				const isColumnNameTooLong = newColumnName.length > 30;
				const isColumnNameBacklog = trimmedColName.toUpperCase() === "BACKLOG";
				const isColumnNameDuplicate = Boolean(
					trimmedColName &&
						(isColumnNameBacklog ||
							boardColumns.some(
								(c) =>
									c.title.toLowerCase() === trimmedColName.toLowerCase() ||
									c.id.toLowerCase() ===
										trimmedColName.toUpperCase().replace(/\s+/g, "_").toLowerCase()
							))
				);

				let columnNameError: string | undefined = undefined;
				if (isColumnNameBacklog) {
					columnNameError = "Backlog is managed in the dedicated Backlog tab";
				} else if (isColumnNameTooShort) {
					columnNameError = "Column name must be at least 2 characters";
				} else if (isColumnNameTooLong) {
					columnNameError = "Column name cannot exceed 30 characters";
				} else if (isColumnNameDuplicate) {
					columnNameError = "A column with this name already exists";
				}

				const isSaveDisabled =
					isColumnNameEmpty ||
					isColumnNameTooShort ||
					isColumnNameTooLong ||
					isColumnNameDuplicate ||
					isColumnNameBacklog;

				return (
					<Portal>
						<div className="fixed inset-0 bg-[#33475B]/20 z-50 flex items-center justify-center">
							<div className="bg-white rounded-lg shadow-lg w-[400px] p-6">
								<h3 className="text-lg font-semibold text-[#33475B] mb-4">
									Add New Column
								</h3>
								<Input
									value={newColumnName}
									onChange={(e) => setNewColumnName(e.target.value)}
									placeholder="E.g., In Review, QA, Blocked"
									autoFocus
									minLength={2}
									maxLength={30}
									error={columnNameError}
									className="mb-1"
									onKeyDown={(e) => {
										if (e.key === "Enter" && !isSaveDisabled) handleAddColumn();
										if (e.key === "Escape") {
											setIsAddingColumn(false);
											setNewColumnName("");
										}
									}}
								/>
								<div className="flex justify-between items-center mb-4 mt-1 text-xs text-slate-400">
									<span>Min 2, max 30 characters</span>
									<span>{newColumnName.length}/30</span>
								</div>
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										onClick={() => {
											setIsAddingColumn(false);
											setNewColumnName("");
										}}
									>
										Cancel
									</Button>
									<Button
										onClick={handleAddColumn}
										disabled={isSaveDisabled}
										className="bg-[#1E88E5] text-white disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Save Column
									</Button>
								</div>
							</div>
						</div>
					</Portal>
				);
			})()}

			{/* Delete Column Modal */}
			{columnToDelete && isAdmin && (
				<Portal>
					<div className="fixed inset-0 bg-[#33475B]/20 z-50 flex items-center justify-center">
						<div className="bg-white rounded-lg shadow-lg w-[400px] p-6">
							<h3 className="text-lg font-semibold text-[#33475B] mb-2">
								Delete Column
							</h3>
							<p className="text-base text-[#6E7B8B] mb-2 font-medium">
								Are you sure you want to delete this column?
							</p>
							<p className="text-sm text-[#6E7B8B] mb-6 leading-relaxed">
								This will permanently remove the column from the board. Tasks in
								this column will not be deleted. They will remain in the project
								but will no longer be associated with this column.
							</p>
							<label className="flex items-start gap-2 mb-6 cursor-pointer">
								<input
									type="checkbox"
									className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
									checked={deleteConfirmationChecked}
									onChange={(e) =>
										setDeleteConfirmationChecked(e.target.checked)
									}
								/>
								<span className="text-sm text-[#33475B] leading-tight mt-1">
									I understand that deleting this column is permanent and cannot
									be undone.
								</span>
							</label>
							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => setColumnToDelete(null)}
								>
									Cancel
								</Button>
								<Button
									onClick={executeDeleteColumn}
									disabled={!deleteConfirmationChecked}
									className="bg-[#E53935] hover:bg-[#D32F2F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Delete Column
								</Button>
							</div>
						</div>
					</div>
				</Portal>
			)}

			{/* Board Columns */}
			<div className="flex-1 overflow-x-auto p-4 flex space-x-4 bg-[#F5F6F8]">
				<DragDropContext onDragEnd={onDragEnd}>
					<div className="flex flex-1 overflow-x-auto overflow-y-hidden gap-5 pb-4 custom-scrollbar items-start">
						{boardColumns.map((col) => (
							<KanbanColumn
								key={col.id}
								id={col.id}
								title={col.title}
								tasks={filteredTasks.filter((t) => t.status === col.id)}
								users={users}
								onTaskClick={setSelectedTask}
								onTaskEdit={(task) => {
									if (!isAdmin && task.assigneeId !== currentUser?.id) {
										toast.error("You can only edit tasks assigned to you");
										return;
									}
									setTaskToEdit(task);
								}}
								isAdmin={isAdmin}
								onDelete={confirmDeleteColumn}
							/>
						))}
					</div>
				</DragDropContext>
			</div>

			<TaskDetailsPanel
				task={selectedTask}
				isOpen={!!selectedTask}
				onClose={() => setSelectedTask(null)}
				users={users}
				project={project}
			/>

			<TaskWizardModal
				isOpen={!!taskToEdit}
				onClose={() => setTaskToEdit(null)}
				taskToEdit={taskToEdit}
				initialProjectId={project?.id}
			/>
		</div>
	);
}
