import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";

export interface UserBasic {
	id: string;
	name: string;
	email: string;
}

export function useUsers() {
	return useQuery({
		queryKey: ["users"],
		queryFn: async (): Promise<UserBasic[]> => {
			const response = await apiClient.get("/users");
			return response.data;
		},
	});
}

export interface UserDetailed extends UserBasic {
	role: string;
	status: string;
	avatar?: string;
	department?: string;
	jobTitle?: string;
	phone?: string;
	joiningDate?: string;
	lastLogin?: string;
	createdAt: string;
	projectsAssigned: number;
	tasksAssigned: number;
	assignedProjectsList: { id: string; name: string; status: string; progress: number }[];
	assignedTasksList: { id: string; title: string; status: string; projectId: string; dueDate: string | null }[];
}

export function useAdminUsers() {
	return useQuery({
		queryKey: ["admin-users"],
		queryFn: async (): Promise<UserDetailed[]> => {
			const response = await apiClient.get("/users");
			return response.data;
		},
	});
}

export function useAssignProjects() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ userId, projectIds }: { userId: string, projectIds: string[] }) => {
			const response = await apiClient.post(`/users/${userId}/assign-projects`, { projectIds });
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

export function useUnassignProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ userId, projectId, taskAction }: { userId: string, projectId: string, taskAction: 'keep' | 'unassign' }) => {
			const response = await apiClient.delete(`/users/${userId}/assign-projects`, { 
				data: { projectId, taskAction } 
			});
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (userId: string) => {
			const response = await apiClient.delete(`/users/${userId}`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}
