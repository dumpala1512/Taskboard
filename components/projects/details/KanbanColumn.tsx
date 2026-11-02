import { Droppable } from "@hello-pangea/dnd";
import {
	ChevronLeft,
	ChevronRight,
	LayoutDashboard,
	Trash2,
} from "lucide-react";
import React from "react";
import type { Task, User } from "../../../server/types";
import { EmptyState } from "../../ui/EmptyState";
import TaskCard from "./TaskCard";

interface KanbanColumnProps {
	id: string;
	title: string;
	tasks: Task[];
	users: User[];
	onTaskClick?: (task: Task) => void;
	onTaskEdit?: (task: Task) => void;
	onTaskDelete?: (task: Task) => void;
	isAdmin?: boolean;
	onDelete?: (id: string) => void;
	onMoveLeft?: (id: string) => void;
	onMoveRight?: (id: string) => void;
	canMoveLeft?: boolean;
	canMoveRight?: boolean;
}

/** Map column id → Zoho status dot color */
const STATUS_DOT: Record<string, string> = {
	TODO: "#9E9E9E",
	IN_PROGRESS: "#2196F3",
	REVIEW: "#7B61FF",
	DONE: "#43A047",
};

export default function KanbanColumn({
	id,
	title,
	tasks,
	users,
	onTaskClick,
	onTaskEdit,
	onTaskDelete,
	isAdmin,
	onDelete,
	onMoveLeft,
	onMoveRight,
	canMoveLeft,
	canMoveRight,
}: KanbanColumnProps) {
	const dotColor = STATUS_DOT[id] ?? "#9EAAB7";

	return (
		<div className="flex flex-col flex-shrink-0 w-[82vw] sm:w-[300px] max-w-[320px] h-full bg-white dark:bg-[#131B2E] rounded-md border border-[#E0E3E8] dark:border-[#222F49] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
			{/* Column header */}
			<div className="px-3 py-2.5 border-b border-[#E0E3E8] dark:border-[#222F49] flex justify-between items-center bg-white dark:bg-[#131B2E] shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					<span
						className="w-2 h-2 rounded-full flex-shrink-0"
						style={{ background: dotColor }}
					/>
					<h3 className="text-sm font-semibold text-[#33475B] dark:text-slate-100 truncate">
						{title}
					</h3>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<span className="bg-[#F5F6F8] dark:bg-[#1A233A] text-[#6E7B8B] dark:text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full border border-[#E0E3E8] dark:border-[#222F49] mr-0.5">
						{tasks.length}
					</span>
					{isAdmin && onMoveLeft && (
						<button
							onClick={() => onMoveLeft(id)}
							disabled={!canMoveLeft}
							className="text-[#9EAAB7] dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 p-1 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
							title="Move column left"
							aria-label="Move column left"
						>
							<ChevronLeft className="w-3.5 h-3.5" />
						</button>
					)}
					{isAdmin && onMoveRight && (
						<button
							onClick={() => onMoveRight(id)}
							disabled={!canMoveRight}
							className="text-[#9EAAB7] dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 p-1 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
							title="Move column right"
							aria-label="Move column right"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</button>
					)}
					{isAdmin && onDelete && (
						<button
							onClick={() => onDelete(id)}
							className="text-[#9EAAB7] dark:text-slate-400 hover:text-[#E53935] hover:bg-[#FFEBEE] dark:hover:bg-red-950/30 p-1 rounded transition-colors ml-0.5"
							title="Delete Column"
							aria-label="Delete Column"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			</div>

			<Droppable droppableId={id}>
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={`flex-1 p-2.5 min-h-[150px] overflow-y-auto transition-colors flex flex-col ${
							snapshot.isDraggingOver
								? "bg-[#E3F2FD] dark:bg-[#1E293B]/70"
								: "bg-[#F9FAFB] dark:bg-[#0E1526]"
						}`}
					>
						{tasks.map((task, index) => (
							<TaskCard
								key={task.id}
								task={task}
								index={index}
								users={users}
								onClick={onTaskClick}
								onEdit={onTaskEdit}
								onDelete={isAdmin ? onTaskDelete : undefined}
							/>
						))}
						{provided.placeholder}

						{tasks.length === 0 && !snapshot.isDraggingOver && (
							<div className="flex-1 mt-4">
								<EmptyState
									icon={LayoutDashboard}
									title="No tasks here"
									description="Move tasks from backlog or create a new task."
								/>
							</div>
						)}
					</div>
				)}
			</Droppable>
		</div>
	);
}
