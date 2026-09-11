import { activityRepository } from "../repositories/activity.repository";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import type { ActivityType } from "../types";

export class ActivityService {
	async logActivity(data: {
		type: ActivityType;
		userId: string;
		projectId?: string;
		taskId?: string;
		details: string;
		fromStatus?: string;
		toStatus?: string;
		taskTitle?: string;
	}) {
		try {
			await activityRepository.create({
				type: data.type,
				userId: data.userId,
				projectId: data.projectId,
				taskId: data.taskId,
				details: data.details,
				fromStatus: data.fromStatus,
				toStatus: data.toStatus,
				taskTitle: data.taskTitle,
			});
		} catch (error) {
			console.error("Failed to log activity:", error);
		}
	}

	async getActivitiesByProjectId(projectId: string, limit: number = 50) {
		const activities = await activityRepository.findAll();
		const sortedActivities = activities.sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		const filtered = sortedActivities.filter(
			(act) => act.projectId && act.projectId.toLowerCase() === projectId.toLowerCase()
		);
		return filtered.slice(0, limit);
	}

	async getRecentActivities(limit: number = 20, userId?: string, role?: string) {
		const activities = await activityRepository.findAll();
		const sortedActivities = activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		
		if (role === "ADMIN" || !userId) {
			return sortedActivities.slice(0, limit);
		}

		// Import dynamically or use a simpler approach to avoid circular deps
		// Actually, let's just do a basic filter:
		// We'll return activities that were performed by the user or are related to their projects/tasks

		const allProjects = await projectRepository.findAll();
		const allTasks = await taskRepository.findAll();

		const userProjectIds = allProjects.filter((p: any) => p.members?.includes(userId)).map((p: any) => p.id);
		const userTaskIds = allTasks.filter((t: any) => t.assignees?.includes(userId) || t.assigneeId === userId).map((t: any) => t.id);

		const filtered = sortedActivities.filter((act) => {
			if (act.userId === userId) return true;
			if (act.projectId && userProjectIds.includes(act.projectId)) return true;
			if (act.taskId && userTaskIds.includes(act.taskId)) return true;
			return false;
		});

		return filtered.slice(0, limit);
	}
}

export const activityService = new ActivityService();
