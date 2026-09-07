import db, { loadDb, saveDb, markTaskDeleted } from "../data";
import type { Task } from "../types";

export class TaskRepository {
	async findAll(): Promise<Task[]> {
		const freshDb = loadDb();
		db.tasks = freshDb.tasks;
		return [...db.tasks];
	}

	async findByProjectId(projectId: string): Promise<Task[]> {
		let tasks = db.tasks.filter((t: any) => t.projectId === projectId);
		if (!tasks || tasks.length === 0) {
			const freshDb = loadDb();
			db.tasks = freshDb.tasks;
			tasks = db.tasks.filter((t: any) => t.projectId === projectId);
		}
		return tasks;
	}

	async findById(id: string): Promise<Task | undefined> {
		let task = db.tasks.find((t: any) => t.id === id);
		if (!task) {
			const freshDb = loadDb();
			db.tasks = freshDb.tasks;
			task = db.tasks.find((t: any) => t.id === id);
		}
		return task;
	}

	async create(task: Task): Promise<Task> {
		loadDb();
		db.tasks.push(task);
		saveDb();
		return task;
	}

	async update(id: string, updates: Partial<Task>): Promise<Task | undefined> {
		loadDb();
		const index = db.tasks.findIndex((t: any) => t.id === id);
		if (index === -1) return undefined;
		const now = new Date().toISOString();
		const isDone = (updates.status || "").toUpperCase() === "DONE" || (updates.status || "").toUpperCase() === "COMPLETED";
		const completedAt = isDone
			? (updates as any).completedAt || (db.tasks[index] as any).completedAt || now
			: undefined;
		db.tasks[index] = {
			...db.tasks[index],
			...updates,
			updatedAt: updates.updatedAt || now,
			...(completedAt ? { completedAt } : {}),
		};
		saveDb();
		return db.tasks[index];
	}

	async delete(id: string): Promise<boolean> {
		loadDb();
		const index = db.tasks.findIndex((t: any) => t.id === id);
		if (index === -1) return false;
		markTaskDeleted(id);
		db.tasks.splice(index, 1);
		saveDb();
		return true;
	}

	async deleteByProjectId(projectId: string): Promise<number> {
		loadDb();
		const initialCount = db.tasks.length;
		const targetId = projectId.toLowerCase();
		const toDelete = db.tasks.filter((t: any) => {
			const pid = (t.projectId || "").toLowerCase();
			return pid === targetId;
		});
		toDelete.forEach((t: any) => {
			if (t.id) markTaskDeleted(t.id);
		});
		db.tasks = db.tasks.filter((t: any) => {
			const pid = (t.projectId || "").toLowerCase();
			return pid !== targetId;
		});
		const deletedCount = initialCount - db.tasks.length;
		if (deletedCount > 0) {
			saveDb();
		}
		return deletedCount;
	}
}

export const taskRepository = new TaskRepository();
