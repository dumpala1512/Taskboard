import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import type { Project } from "../types";
import { activityService } from "./activity.service";

export class ProjectService {
	async getAllProjects(userId?: string, role?: string): Promise<Project[]> {
		let projects = await projectRepository.findAll();

		// Dynamically calculate progress based on tasks
		projects = await Promise.all(
			projects.map(async (project) => {
				const tasks = await taskRepository.findByProjectId(project.id);
				if (tasks.length === 0) return { ...project, progress: 0 };
				
				let weight = 0;
				for (const t of tasks) {
					if (t.status === "DONE") weight += 1;
					else if (t.status === "REVIEW") weight += 0.66;
					else if (t.status === "IN_PROGRESS") weight += 0.33;
				}
				const progress = Math.round((weight / tasks.length) * 100);
				return { ...project, progress };
			})
		);

		if (role !== "ADMIN" && userId) {
			projects = projects.filter((p) => p.members.includes(userId));
		}

		return projects.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}

	async getProjectById(id: string): Promise<Project | null> {
		const project = await projectRepository.findById(id);
		if (!project) return null;

		const tasks = await taskRepository.findByProjectId(project.id);
		if (tasks.length === 0) return { ...project, progress: 0 };
		
		let weight = 0;
		for (const t of tasks) {
			if (t.status === "DONE") weight += 1;
			else if (t.status === "REVIEW") weight += 0.66;
			else if (t.status === "IN_PROGRESS") weight += 0.33;
		}
		const progress = Math.round((weight / tasks.length) * 100);
		
		return { ...project, progress };
	}

	async createProject(
		data: Omit<Project, "id" | "createdAt" | "updatedAt">,
		userId?: string,
	): Promise<Project> {
		const project = await projectRepository.create(data);
		if (userId) {
			await activityService.logActivity({
				type: "PROJECT_CREATED",
				userId,
				projectId: project.id,
				details: project.name,
			});
		}
		return project;
	}

	async updateProject(
		id: string,
		updates: Partial<Project>,
		userId?: string,
	): Promise<Project> {
		const project = await projectRepository.findById(id);
		if (!project) {
			throw new Error("Project not found");
		}
		const updated = await projectRepository.update(id, updates);
		if (userId) {
			await activityService.logActivity({
				type: "PROJECT_UPDATED",
				userId,
				projectId: updated.id,
				details: updated.name,
			});
		}
		return updated;
	}

	async deleteProject(id: string): Promise<boolean> {
		const project = await projectRepository.findById(id);
		if (!project) {
			throw new Error("Project not found");
		}
		return projectRepository.delete(id);
	}

	async deleteColumn(projectId: string, columnId: string, userId?: string): Promise<Project> {
		const project = await projectRepository.findById(projectId);
		if (!project) throw new Error("Project not found");

		if (columnId === "BACKLOG") throw new Error("Cannot delete the Backlog column");

		let columns = (project.columns && project.columns.length > 0) ? [...project.columns] : [
			{ id: "TODO", title: "To Do" },
			{ id: "IN_PROGRESS", title: "In Progress" },
			{ id: "REVIEW", title: "Review" },
			{ id: "DONE", title: "Done" },
		];

		// Ensure BACKLOG is not stored as a board column
		columns = columns.filter((c) => c.id !== "BACKLOG");

		// Check if column exists
		if (!columns.find((c) => c.id === columnId)) {
			throw new Error("Column not found");
		}

		// Remove the column
		columns = columns.filter((c) => c.id !== columnId);

		// Move tasks assigned to this column to BACKLOG
		const tasks = await taskRepository.findByProjectId(projectId);
		for (const task of tasks) {
			if (task.status === columnId) {
				await taskRepository.update(task.id, { status: "BACKLOG" as any });
			}
		}

		const updated = await projectRepository.update(projectId, { columns });
		
		if (userId) {
			await activityService.logActivity({
				type: "PROJECT_UPDATED",
				userId,
				projectId: updated.id,
				details: `Deleted column ${columnId}`,
			});
		}
		return updated;
	}
}

export const projectService = new ProjectService();
