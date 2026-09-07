import { taskRepository } from "../repositories/task.repository";
import { projectRepository } from "../repositories/project.repository";
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
		if (!data.assigneeId && data.status === "TODO") {
			data.status = "BACKLOG";
		} else if (data.assigneeId && (!data.status || data.status === "BACKLOG")) {
			data.status = "TODO";
		}

		const newTask: Task = {
			...taskData,
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
			// Explicitly moved to unassigned: ensure assignee is cleared and not in TODO
			updates.assigneeId = "" as any;
			if (!updates.status && existingTask?.status === "TODO") {
				updates.status = "BACKLOG";
			} else if (updates.status === "TODO") {
				updates.status = "BACKLOG";
			}
		}

		updates.updatedAt = new Date().toISOString();
		const updated = await taskRepository.update(id, updates);
		if (userId && updated) {
			await activityService.logActivity({
				type: updates.status === "DONE" ? "TASK_COMPLETED" : "TASK_UPDATED",
				userId,
				projectId: updated.projectId,
				taskId: updated.id,
				details: updated.title,
			});
		}
		return updated;
	}

	async deleteTask(id: string): Promise<boolean> {
		return taskRepository.delete(id);
	}

	async duplicateTask(id: string): Promise<Task | undefined> {
		const existingTask = await taskRepository.findById(id);
		if (!existingTask) return undefined;

		const { id: _, createdAt, updatedAt, status, ...rest } = existingTask;

		return this.createTask({
			...rest,
			title: `${rest.title} (Copy)`,
			status: "TODO", // reset status for duplicated tasks
		});
	}
}

export const taskService = new TaskService();
