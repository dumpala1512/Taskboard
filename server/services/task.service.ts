import { taskRepository } from "../repositories/task.repository";
import { v4 as uuidv4 } from "uuid";
import type { Task } from "../types";
import { activityService } from "./activity.service";

export class TaskService {
	async getAllTasks(userId?: string, role?: string): Promise<Task[]> {
		const tasks = await taskRepository.findAll();
		return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	async getTasksByProjectId(projectId: string): Promise<Task[]> {
		const tasks = await taskRepository.findByProjectId(projectId);
		return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	}

	async createTask(
		taskData: Omit<Task, "id" | "createdAt" | "updatedAt">,
		userId?: string
	): Promise<Task> {
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
