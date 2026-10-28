// Task hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";
import type { Task } from "../server/types";

function normalizeTask(raw: any): Task {
	if (!raw) return raw as Task;
	return {
		...raw,
		id: String(raw.id),
		projectId: raw.project_id ? String(raw.project_id) : String(raw.projectId || ""),
		assigneeId: raw.assignee_id ? String(raw.assignee_id) : (raw.assigneeId ? String(raw.assigneeId) : undefined),
		assignees: Array.isArray(raw.assignees) ? raw.assignees : (raw.assignee_id ? [String(raw.assignee_id)] : []),
		startDate: raw.start_date || raw.startDate || null,
		dueDate: raw.due_date || raw.dueDate || null,
		estimatedTime: raw.estimated_time ?? raw.estimatedTime ?? null,
		taskType: raw.task_type || raw.taskType || "Feature",
		tags: Array.isArray(raw.tags) ? raw.tags : [],
		status: raw.status || "TODO",
		priority: raw.priority || "MEDIUM",
		createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
		updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
	} as Task;
}


export function useTasks(projectId?: string) {
	return useQuery({
		queryKey: projectId ? ["tasks", { projectId }] : ["tasks"],
		queryFn: async (): Promise<Task[]> => {
			const params = projectId ? { project_id: projectId } : undefined;
			const response = await apiClient.get("/tasks", { params });
			const rawList = response.data?.data || response.data || [];
			return Array.isArray(rawList) ? rawList.map(normalizeTask) : [];
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
			const raw = response.data?.data || response.data;
			return normalizeTask(raw);
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
			const raw = response.data?.data || response.data;
			return normalizeTask(raw);
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
