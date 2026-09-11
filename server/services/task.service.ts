import { taskRepository } from "../repositories/task.repository";
import { projectRepository } from "../repositories/project.repository";
import { userRepository } from "../repositories/user.repository";
import { v4 as uuidv4 } from "uuid";
import type { Task } from "../types";
import { activityService } from "./activity.service";

export class TaskService {
	async getAllTasks(userId?: string, role?: string): Promise<Task[]> {
		const [tasks, projects] = await Promise.all([
			taskRepository.findAll(),
			projectRepository.findAll(),
		]);
		const validProjectIds = new Set<string>();
		projects.forEach((p) => {
			if (p.id) validProjectIds.add(p.id.toLowerCase());
			if (p.key) validProjectIds.add(p.key.toLowerCase());
		});
		const validTasks = tasks.filter(
			(t) => t.projectId && validProjectIds.has(t.projectId.toLowerCase())
		);
		return validTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	async getTasksByProjectId(projectId: string): Promise<Task[]> {
		const tasks = await taskRepository.findByProjectId(projectId);
		return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	async createTask(
		taskData: Omit<Task, "id" | "createdAt" | "updatedAt">,
		userId?: string
	): Promise<Task> {
		if (taskData.projectId && taskData.dueDate) {
			const project = await projectRepository.findById(taskData.projectId);
			if (project?.dueDate) {
				const taskDue = new Date(taskData.dueDate);
				const projectDue = new Date(project.dueDate);
				if (taskDue > projectDue) {
					const formattedProjDue = project.dueDate.split("T")[0];
					throw new Error(
						`Task due date must not cross the project target date (${formattedProjDue})`
					);
				}
			}
		}

		if (taskData.assigneeId && taskData.projectId) {
			const project = await projectRepository.findById(taskData.projectId);
			if (project) {
				const isMember =
					project.ownerId === taskData.assigneeId ||
					(Array.isArray(project.members) &&
						project.members.includes(taskData.assigneeId));
				if (!isMember) {
					throw new Error("Add the member to the project and then assign task");
				}
			}
		}

		const data = { ...taskData };
		if (!data.status) {
			data.status = "TODO";
		}

		const newTask: Task = {
			...data,
			id: uuidv4(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const created = await taskRepository.create(newTask);
		if (userId) {
			await activityService.logActivity({
				type: "TASK_CREATED",
				userId,
				projectId: created.projectId,
				taskId: created.id,
				taskTitle: created.title,
				details: created.title,
			});
		}
		return created;
	}

	async updateTask(
		id: string,
		updates: Partial<Task>,
		userId?: string
	): Promise<Task | undefined> {
		const existingTask = await taskRepository.findById(id);

		const targetProjectId = updates.projectId || existingTask?.projectId;
		const targetDueDate = updates.dueDate || existingTask?.dueDate;
		if (targetProjectId && targetDueDate) {
			const project = await projectRepository.findById(targetProjectId);
			if (project?.dueDate) {
				const taskDue = new Date(targetDueDate);
				const projectDue = new Date(project.dueDate);
				if (taskDue > projectDue) {
					const formattedProjDue = project.dueDate.split("T")[0];
					throw new Error(
						`Task due date must not cross the project target date (${formattedProjDue})`
					);
				}
			}
		}

		if (
			updates.assigneeId !== undefined &&
			updates.assigneeId !== null &&
			updates.assigneeId !== ""
		) {
			const projectId = updates.projectId || existingTask?.projectId;
			if (projectId) {
				const project = await projectRepository.findById(projectId);
				if (project) {
					const isMember =
						project.ownerId === updates.assigneeId ||
						(Array.isArray(project.members) &&
							project.members.includes(updates.assigneeId));
					if (!isMember) {
						throw new Error("Add the member to the project and then assign task");
					}
				}
			}

			// If assigned to someone and currently in BACKLOG (or moving without status), show in TODO
			if (!updates.status && existingTask?.status === "BACKLOG") {
				updates.status = "TODO";
			}
		} else if (updates.assigneeId !== undefined) {
			// Explicitly moved to unassigned: ensure assignee is cleared
			updates.assigneeId = "" as any;
		}

		// Enforce step-by-step workflow transitions (no direct skipping to REVIEW or DONE)
		if (updates.status && existingTask && updates.status !== existingTask.status) {
			const project = existingTask.projectId
				? await projectRepository.findById(existingTask.projectId)
				: null;
			const defaultCols = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
			const colIds = project?.columns?.length
				? project.columns.map((c) => c.id)
				: defaultCols;
			const workflow = ["BACKLOG", ...colIds.filter((c) => c !== "BACKLOG")];

			const curIdx = workflow.indexOf(existingTask.status);
			const newIdx = workflow.indexOf(updates.status);

			if (curIdx !== -1 && newIdx !== -1 && Math.abs(newIdx - curIdx) > 1) {
				throw new Error(
					`Tasks must move step by step through workflow stages (cannot skip directly from ${existingTask.status} to ${updates.status})`
				);
			}
		}

		// Track all minor and major modifications
		const changes: string[] = [];
		const isStatusTransition = Boolean(
			updates.status && existingTask && updates.status !== existingTask.status
		);
		const fromStatus = existingTask?.status;
		const toStatus = updates.status;

		if (isStatusTransition) {
			changes.push(`status to ${toStatus}`);
		}

		if (updates.priority && existingTask && updates.priority !== existingTask.priority) {
			changes.push(`priority from ${existingTask.priority} to ${updates.priority}`);
		}

		if (updates.title && existingTask && updates.title.trim() !== existingTask.title.trim()) {
			changes.push(`renamed to "${updates.title.trim()}"`);
		}

		if (updates.assigneeId !== undefined && existingTask && updates.assigneeId !== existingTask.assigneeId) {
			if (updates.assigneeId) {
				const assignee = await userRepository.findById(updates.assigneeId);
				changes.push(`assigned to ${assignee?.name || "team member"}`);
			} else {
				changes.push("unassigned");
			}
		}

		if (updates.dueDate !== undefined && existingTask && updates.dueDate !== existingTask.dueDate) {
			if (updates.dueDate) {
				const due = new Date(updates.dueDate).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				});
				changes.push(`due date to ${due}`);
			} else {
				changes.push("due date removed");
			}
		}

		if (updates.startDate !== undefined && existingTask && updates.startDate !== existingTask.startDate) {
			if (updates.startDate) {
				const start = new Date(updates.startDate).toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				});
				changes.push(`start date to ${start}`);
			} else {
				changes.push("start date removed");
			}
		}

		if (updates.estimatedTime !== undefined && existingTask && updates.estimatedTime !== existingTask.estimatedTime) {
			changes.push(`estimate to ${updates.estimatedTime}h`);
		}

		if (updates.taskType && existingTask && updates.taskType !== existingTask.taskType) {
			changes.push(`type to ${updates.taskType}`);
		}

		if (updates.description !== undefined && existingTask && updates.description !== existingTask.description) {
			changes.push("updated description");
		}

		if (updates.tags && existingTask && JSON.stringify(updates.tags) !== JSON.stringify(existingTask.tags)) {
			changes.push("updated tags");
		}

		updates.updatedAt = new Date().toISOString();
		const updated = await taskRepository.update(id, updates);
		if (userId && updated && changes.length > 0) {
			if (isStatusTransition) {
				const extraChanges = changes.filter((c) => !c.startsWith("status to"));
				const details =
					extraChanges.length > 0
						? `Moved "${updated.title}" from ${fromStatus} to ${toStatus} (${extraChanges.join(", ")})`
						: `Moved "${updated.title}" from ${fromStatus} to ${toStatus}`;

				await activityService.logActivity({
					type: toStatus === "DONE" ? "TASK_COMPLETED" : "TASK_STATUS_CHANGED",
					userId,
					projectId: updated.projectId,
					taskId: updated.id,
					fromStatus,
					toStatus,
					taskTitle: updated.title,
					details,
				});
			} else {
				await activityService.logActivity({
					type: "TASK_UPDATED",
					userId,
					projectId: updated.projectId,
					taskId: updated.id,
					taskTitle: updated.title,
					details: `Updated "${updated.title}": ${changes.join(", ")}`,
				});
			}
		}
		return updated;
	}

	async deleteTask(id: string, userId?: string): Promise<boolean> {
		const existingTask = await taskRepository.findById(id);
		const deleted = await taskRepository.delete(id);
		if (deleted && existingTask && userId) {
			await activityService.logActivity({
				type: "TASK_DELETED",
				userId,
				projectId: existingTask.projectId,
				taskId: existingTask.id,
				taskTitle: existingTask.title,
				details: `Deleted task "${existingTask.title}"`,
			});
		}
		return deleted;
	}

	async duplicateTask(id: string, userId?: string): Promise<Task | undefined> {
		const existingTask = await taskRepository.findById(id);
		if (!existingTask) return undefined;

		const { id: _, createdAt, updatedAt, status, ...rest } = existingTask;

		return this.createTask(
			{
				...rest,
				title: `${rest.title} (Copy)`,
				status: "TODO", // reset status for duplicated tasks
			},
			userId
		);
	}
}

export const taskService = new TaskService();
