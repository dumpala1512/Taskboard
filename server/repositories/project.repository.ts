import { v4 as uuidv4 } from "uuid";
import db, { loadDb, markProjectDeleted, markTaskDeleted, saveDb, unmarkProjectDeleted } from "../data";
import type { Project } from "../types";

export class ProjectRepository {
	async findAll(): Promise<Project[]> {
		const freshDb = loadDb();
		db.projects = freshDb.projects;
		return [...db.projects];
	}

	async findById(id: string): Promise<Project | undefined> {
		let project = db.projects.find(
			(p: Project) =>
				p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()),
		);
		if (!project) {
			const freshDb = loadDb();
			project = freshDb.projects.find(
				(p: Project) =>
					p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()),
			);
			if (project) {
				db.projects = freshDb.projects;
			}
		}
		return project;
	}

	async create(
		project: Omit<Project, "id" | "createdAt" | "updatedAt">,
	): Promise<Project> {
		const newProject: Project = {
			columns: [
				{ id: "TODO", title: "To Do" },
				{ id: "IN_PROGRESS", title: "In Progress" },
				{ id: "REVIEW", title: "Review" },
				{ id: "DONE", title: "Done" },
			],
			...project,
			id: uuidv4(),
			key: project.key || `PRJ-${Math.floor(Math.random() * 1000)}`,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		loadDb();
		unmarkProjectDeleted(newProject.id, newProject.key);
		db.projects.push(newProject);
		saveDb();
		return newProject;
	}

	async update(id: string, updates: Partial<Project>): Promise<Project> {
		loadDb();
		const index = db.projects.findIndex(
			(p: any) =>
				p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()),
		);
		if (index === -1) {
			throw new Error("Project not found");
		}
		db.projects[index] = {
			...db.projects[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};
		saveDb();
		return db.projects[index];
	}

	async delete(id: string): Promise<boolean> {
		loadDb();
		const targetId = id.toLowerCase();
		const index = db.projects.findIndex(
			(p: any) =>
				p.id === id || p.id.toLowerCase() === targetId || (p.key && p.key.toLowerCase() === targetId),
		);
		if (index === -1) {
			markProjectDeleted(id);
			saveDb();
			return false;
		}
		const proj = db.projects[index];
		markProjectDeleted(id);
		markProjectDeleted(proj.id, proj.key);

		db.projects.splice(index, 1);

		// Also cleanup and tombstone tasks and activities related to this project
		const tasksToRemove = db.tasks.filter((t: any) => 
			t.projectId === id || 
			t.projectId.toLowerCase() === targetId || 
			t.projectId === proj.id || 
			(proj.key && t.projectId.toLowerCase() === proj.key.toLowerCase())
		);
		tasksToRemove.forEach((t: any) => markTaskDeleted(t.id));

		db.tasks = db.tasks.filter((t: any) => 
			t.projectId !== id && 
			t.projectId.toLowerCase() !== targetId && 
			t.projectId !== proj.id && 
			(!proj.key || t.projectId.toLowerCase() !== proj.key.toLowerCase())
		);
		db.activities = db.activities.filter((a: any) => 
			a.projectId !== id && 
			a.projectId?.toLowerCase() !== targetId && 
			a.projectId !== proj.id && 
			(!proj.key || a.projectId?.toLowerCase() !== proj.key.toLowerCase())
		);

		saveDb();
		return true;
	}
}

export const projectRepository = new ProjectRepository();
