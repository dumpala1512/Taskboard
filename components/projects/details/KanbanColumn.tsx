import { Droppable } from "@hello-pangea/dnd";
import { LayoutDashboard, Trash2 } from "lucide-react";
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
	isAdmin?: boolean;
	onDelete?: (id: string) => void;
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
	isAdmin,
	onDelete,
}: KanbanColumnProps) {
	const dotColor = STATUS_DOT[id] ?? "#9EAAB7";

	return (
		<div className="flex flex-col flex-shrink-0 w-[300px] h-full bg-white rounded-md border border-[#E0E3E8] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
			{/* Column header */}
			<div className="px-3 py-2.5 border-b border-[#E0E3E8] flex justify-between items-center bg-white shrink-0">
				<div className="flex items-center gap-2">
					<span
						className="w-2 h-2 rounded-full flex-shrink-0"
						style={{ background: dotColor }}
					/>
					<h3 className="text-sm font-semibold text-[#33475B]">{title}</h3>
				</div>
				<div className="flex items-center gap-2">
					<span className="bg-[#F5F6F8] text-[#6E7B8B] text-xs font-medium px-2 py-0.5 rounded-full border border-[#E0E3E8]">
						{tasks.length}
					</span>
					{isAdmin && onDelete && (
						<button
							onClick={() => onDelete(id)}
							className="text-[#9EAAB7] hover:text-[#E53935] hover:bg-[#FFEBEE] p-1 rounded transition-colors"
							title="Delete Column"
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
							snapshot.isDraggingOver ? "bg-[#E3F2FD]" : "bg-[#F9FAFB]"
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
