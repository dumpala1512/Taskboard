import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import type { Project } from "../types";
import { activityService } from "./activity.service";

export class ProjectService {
	async getAllProjects(userId?: string, role?: string, userEmail?: string | null): Promise<Project[]> {
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

		if (role !== "ADMIN" && (userId || userEmail)) {
			let assignedIds = new Set<string>();
			if (userId) {
				const u = await import("../repositories/user.repository").then(m => m.userRepository.findById(userId));
				(u?.assignedProjectIds || []).forEach(id => assignedIds.add(id));
			}
			if (userEmail) {
				const u = await import("../repositories/user.repository").then(m => m.userRepository.findByEmail(userEmail));
				(u?.assignedProjectIds || []).forEach(id => assignedIds.add(id));
			}

			projects = projects.filter(
				(p) =>
					(userId && p.members?.includes(userId)) ||
					(userEmail && p.members?.includes(userEmail)) ||
					(userId && p.ownerId === userId) ||
					(userEmail && p.ownerId === userEmail) ||
					assignedIds.has(p.id),
			);
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

		// If members list is updated, automatically remove removed members from project tasks
		if (Array.isArray(updates.members)) {
			const currentMembers = project.members || [];
			const newMemberSet = new Set(updates.members.map((m) => m.toLowerCase()));
			const removedMembers = currentMembers.filter(
				(m) =>
					!newMemberSet.has(m.toLowerCase()) &&
					(!project.ownerId || m.toLowerCase() !== project.ownerId.toLowerCase()) &&
					(!updates.ownerId || m.toLowerCase() !== updates.ownerId.toLowerCase()),
			);

			if (removedMembers.length > 0) {
				const removedSet = new Set(removedMembers.map((m) => m.toLowerCase()));
				const tasks = await taskRepository.findByProjectId(id);
				for (const task of tasks) {
					const isAssigneeRemoved =
						task.assigneeId && removedSet.has(task.assigneeId.toLowerCase());
					const hasAssigneesRemoved =
						Array.isArray(task.assignees) &&
						task.assignees.some((a) => removedSet.has(a.toLowerCase()));

					if (isAssigneeRemoved || hasAssigneesRemoved) {
						const nextAssignees = (task.assignees || []).filter(
							(a) => !removedSet.has(a.toLowerCase()),
						);
						const nextAssigneeId = isAssigneeRemoved ? "" : task.assigneeId;
						const nextStatus =
							!nextAssigneeId && task.status === "TODO" ? "BACKLOG" : task.status;
						await taskRepository.update(task.id, {
							assigneeId: nextAssigneeId,
							assignees: nextAssignees,
							status: nextStatus,
						});
					}
				}
			}
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
		// Delete all tasks associated with this project (both id and key)
		await taskRepository.deleteByProjectId(project.id);
		if (project.key) {
			await taskRepository.deleteByProjectId(project.key);
		}
		return projectRepository.delete(project.id);
	}

	async deleteColumn(projectId: string, columnId: string, userId?: string): Promise<Project> {
		const project = await projectRepository.findById(projectId);
		if (!project) throw new Error("Project not found");

		if (columnId.toUpperCase() === "BACKLOG") throw new Error("Cannot delete the Backlog column");

		let columns = (project.columns && project.columns.length > 0) ? [...project.columns] : [
			{ id: "TODO", title: "To Do" },
			{ id: "IN_PROGRESS", title: "In Progress" },
			{ id: "REVIEW", title: "Review" },
			{ id: "DONE", title: "Done" },
		];

		// Ensure BACKLOG is not stored as a board column
		columns = columns.filter((c) => c.id.toUpperCase() !== "BACKLOG");

		// Check if column exists (case-insensitive)
		const matchedCol = columns.find((c) => c.id.toLowerCase() === columnId.toLowerCase());
		if (!matchedCol) {
			throw new Error("Column not found");
		}

		// Remove the column
		columns = columns.filter((c) => c.id.toLowerCase() !== columnId.toLowerCase());

		// Move tasks assigned to this column to BACKLOG
		const tasks = await taskRepository.findByProjectId(project.id);
		for (const task of tasks) {
			if (task.status?.toLowerCase() === columnId.toLowerCase() || task.status === matchedCol.id) {
				await taskRepository.update(task.id, { status: "BACKLOG" as any });
			}
		}

		const updated = await projectRepository.update(project.id, { columns });
		
		if (userId) {
			await activityService.logActivity({
				type: "PROJECT_UPDATED",
				userId,
				projectId: updated.id,
				details: `Deleted column ${matchedCol.title || columnId}`,
			});
		}
		return updated;
	}
}

export const projectService = new ProjectService();
