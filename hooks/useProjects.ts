import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";
import type { Project } from "../server/types";

export function useProjects(filters?: { status?: string; search?: string }) {
	return useQuery({
		queryKey: ["projects", filters],
		queryFn: async (): Promise<Project[]> => {
			const params = new URLSearchParams();
			if (filters?.status) params.append("status", filters.status);
			if (filters?.search) params.append("search", filters.search);

			const response = await apiClient.get(`/projects?${params.toString()}`);
			return response.data;
		},
	});
}

export function useProject(id: string) {
	return useQuery({
		queryKey: ["projects", id],
		queryFn: async (): Promise<Project> => {
			const response = await apiClient.get(`/projects/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<Project>) => {
			const response = await apiClient.post("/projects", data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

export function useUpdateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...data }: Partial<Project> & { id: string }) => {
			const response = await apiClient.patch(`/projects/${id}`, data);
			return response.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["projects", variables.id] });
		},
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.delete(`/projects/${id}`);
			return response.data;
		},
		onSuccess: (_, deletedId) => {
			queryClient.setQueryData(["projects"], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.filter((p: any) => p.id !== deletedId);
			});
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}
