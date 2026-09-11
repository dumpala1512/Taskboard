// Task hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";
import type { Task } from "../server/types";

export function useTasks(projectId?: string) {
	return useQuery({
		queryKey: projectId ? ["tasks", { projectId }] : ["tasks"],
		queryFn: async (): Promise<Task[]> => {
			const params = projectId ? { projectId } : undefined;
			const response = await apiClient.get("/tasks", { params });
			return response.data;
		},
	});
}

export function useCreateTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			taskData: Omit<Task, "id" | "createdAt" | "updatedAt">,
		) => {
			const response = await apiClient.post("/tasks", taskData);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["activities"] });
			if (variables.projectId) {
				queryClient.invalidateQueries({
					queryKey: ["tasks", { projectId: variables.projectId }],
				});
				queryClient.invalidateQueries({
					queryKey: ["activities", { projectId: variables.projectId }],
				});
			}
		},
	});
}

export function useUpdateTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
			const response = await apiClient.patch(`/tasks/${id}`, data);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["activities"] });
			if (variables.projectId) {
				queryClient.invalidateQueries({
					queryKey: ["tasks", { projectId: variables.projectId }],
				});
				queryClient.invalidateQueries({
					queryKey: ["activities", { projectId: variables.projectId }],
				});
			}
		},
	});
}

export function useDeleteTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/tasks/${id}`);
			return id;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["activities"] });
		},
	});
}

export function useDuplicateTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.post(`/tasks/${id}?action=duplicate`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["activities"] });
		},
	});
}
