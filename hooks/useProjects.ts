import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";
import type { Project } from "../server/types";

function normalizeProject(p: any): Project {
	if (!p) return p;
	return {
		...p,
		id: String(p.id),
		ownerId: p.created_by
			? String(p.created_by)
			: p.owner_id
				? String(p.owner_id)
				: p.ownerId,
		startDate: p.start_date || p.startDate,
		dueDate: p.end_date || p.dueDate,
		members: Array.isArray(p.members) ? p.members.map(String) : [],
		columns: Array.isArray(p.columns) ? p.columns : [],
		tags: Array.isArray(p.tags) ? p.tags : [],
		progress: p.progress ?? 0,
		status: p.status || "ACTIVE",
		createdAt: p.created_at || p.createdAt || new Date().toISOString(),
		updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
	};
}

export function useProjects(filters?: { status?: string; search?: string }) {
	return useQuery({
		queryKey: ["projects", filters],
		queryFn: async (): Promise<Project[]> => {
			const params = new URLSearchParams();
			if (filters?.status) params.append("status", filters.status);
			if (filters?.search) params.append("search", filters.search);

			const response = await apiClient.get(`/projects?${params.toString()}`);
			const rawList = response.data?.data || response.data || [];
			return Array.isArray(rawList) ? rawList.map(normalizeProject) : [];
		},
	});
}

export function useProject(id: string) {
	return useQuery({
		queryKey: ["projects", id],
		queryFn: async (): Promise<Project> => {
			const response = await apiClient.get(`/projects/${id}`);
			const data = response.data?.data || response.data;
			return normalizeProject(data);
		},
		enabled: !!id,
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<Project>) => {
			const payload: any = {
				name: data.name,
				description: data.description,
				status: data.status || "ACTIVE",
				key: data.key,
				owner_id: data.ownerId,
				members: data.members,
				tags: data.tags,
				progress: data.progress,
				start_date: data.startDate,
				end_date: data.dueDate,
				columns: data.columns,
			};
			const response = await apiClient.post("/projects", payload);
			const created = response.data?.data || response.data;
			return normalizeProject(created);
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
			const payload: any = {
				...(data.name !== undefined && { name: data.name }),
				...(data.description !== undefined && { description: data.description }),
				...(data.status !== undefined && { status: data.status }),
				...(data.key !== undefined && { key: data.key }),
				...(data.ownerId !== undefined && { owner_id: data.ownerId }),
				...(data.members !== undefined && { members: data.members }),
				...(data.tags !== undefined && { tags: data.tags }),
				...(data.progress !== undefined && { progress: data.progress }),
				...(data.startDate !== undefined && { start_date: data.startDate }),
				...(data.dueDate !== undefined && { end_date: data.dueDate }),
				...(data.columns !== undefined && { columns: data.columns }),
			};
			const response = await apiClient.patch(`/projects/${id}`, payload);
			const updated = response.data?.data || response.data;
			return normalizeProject(updated);
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
			const target = (deletedId || "").toLowerCase();
			queryClient.setQueryData(["projects"], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.filter(
					(p: any) =>
						p &&
						p.id !== deletedId &&
						p.id?.toLowerCase() !== target &&
						(!p.key || p.key.toLowerCase() !== target)
				);
			});
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["analytics"] });
			queryClient.invalidateQueries({ queryKey: ["activities"] });
		},
	});
}
