import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "../lib/axios";

export interface ActivityItem {
	id: string;
	type:
		| "TASK_CREATED"
		| "TASK_UPDATED"
		| "TASK_STATUS_CHANGED"
		| "TASK_COMPLETED"
		| "TASK_DELETED"
		| "PROJECT_CREATED"
		| "PROJECT_UPDATED"
		| "MEMBER_ASSIGNED";
	user: {
		name: string;
		avatar?: string;
	};
	target: string;
	details?: string;
	fromStatus?: string;
	toStatus?: string;
	taskTitle?: string;
	projectId?: string;
	taskId?: string;
	timestamp: string;
	createdAt?: string;
	isRead?: boolean;
}

export function useActivities(projectId?: string) {
	return useQuery<ActivityItem[], Error>({
		queryKey: projectId ? ["activities", { projectId }] : ["activities"],
		queryFn: async () => {
			const { data } = await api.get("/activities", {
				params: projectId ? { projectId } : undefined,
			});
			return data;
		},
		refetchInterval: 15000,
	});
}

export function useProjectActivities(projectId?: string) {
	return useActivities(projectId);
}
