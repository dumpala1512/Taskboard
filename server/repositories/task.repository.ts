import db, { loadDb, saveDb } from "../data";
import { Task } from "../types";

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
    db.tasks[index] = { ...db.tasks[index], ...updates };
    saveDb();
    return db.tasks[index];
  }

  async delete(id: string): Promise<boolean> {
    loadDb();
    const index = db.tasks.findIndex((t: any) => t.id === id);
    if (index === -1) return false;
    db.tasks.splice(index, 1);
    saveDb();
    return true;
  }
}

export const taskRepository = new TaskRepository();
