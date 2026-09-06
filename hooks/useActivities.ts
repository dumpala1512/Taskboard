import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "../lib/axios";

export interface ActivityItem {
	id: string;
	type:
		| "TASK_CREATED"
		| "TASK_UPDATED"
		| "TASK_COMPLETED"
		| "PROJECT_CREATED"
		| "PROJECT_UPDATED"
		| "MEMBER_ASSIGNED";
	user: {
		name: string;
		avatar?: string;
	};
	target: string;
	timestamp: string;
	isRead?: boolean;
}

export function useActivities() {
	return useQuery<ActivityItem[], Error>({
		queryKey: ["activities"],
		queryFn: async () => {
			const { data } = await api.get("/activities");
			return data;
		},
		refetchInterval: 30000, // Refresh every 30s
	});
}
