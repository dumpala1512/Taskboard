import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";

export interface UserBasic {
	id: string;
	name: string;
	email: string;
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
	assignedProjectsList: {
		id: string;
		name: string;
		status: string;
		progress: number;
	}[];
	assignedTasksList: {
		id: string;
		title: string;
		status: string;
		projectId: string;
		dueDate: string | null;
	}[];
}

function normalizeUser(u: any): UserDetailed {
	const roleUpper = (u.role || "MEMBER").toUpperCase();
	return {
		id: String(u.id),
		name: u.full_name || u.name || "",
		email: u.email || "",
		role: roleUpper,
		status: (u.status || "ACTIVE").toUpperCase(),
		avatar: u.avatar,
		department: u.department || "",
		jobTitle: u.job_title || u.jobTitle || "",
		phone: u.phone,
		joiningDate: u.joining_date || u.joiningDate,
		lastLogin: u.last_login || u.lastLogin,
		createdAt: u.created_at || u.createdAt || new Date().toISOString(),
		projectsAssigned:
			u.projects_assigned ??
			u.projectsAssigned ??
			(Array.isArray(u.assignedProjectsList)
				? u.assignedProjectsList.length
				: 0),
		tasksAssigned:
			u.tasks_assigned ??
			u.tasksAssigned ??
			(Array.isArray(u.assignedTasksList)
				? u.assignedTasksList.length
				: 0),
		assignedProjectsList:
			u.assigned_projects_list || u.assignedProjectsList || [],
		assignedTasksList: u.assigned_tasks_list || u.assignedTasksList || [],
	};
}

export function useUsers() {
	return useQuery({
		queryKey: ["users"],
		queryFn: async (): Promise<UserBasic[]> => {
			const response = await apiClient.get("/admin/users");
			const rawList = response.data?.data || response.data || [];
			return Array.isArray(rawList) ? rawList.map(normalizeUser) : [];
		},
	});
}

export function useAdminUsers() {
	return useQuery({
		queryKey: ["admin-users"],
		queryFn: async (): Promise<UserDetailed[]> => {
			const response = await apiClient.get("/admin/users");
			const rawList = response.data?.data || response.data || [];
			return Array.isArray(rawList) ? rawList.map(normalizeUser) : [];
		},
	});
}

export function useAssignProjects() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			userId,
			projectIds,
		}: { userId: string; projectIds: string[] }) => {
			const response = await apiClient.post(
				`/users/${userId}/assign-projects`,
				{ project_ids: projectIds }
			);
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
		mutationFn: async ({
			userId,
			projectId,
		}: {
			userId: string;
			projectId: string;
			taskAction?: "keep" | "unassign";
		}) => {
			const response = await apiClient.delete(
				`/users/${userId}/assign-projects`,
				{
					data: { project_id: projectId },
				}
			);
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
			const response = await apiClient.delete(`/admin/users/${userId}`);
			return response.data;
		},
		onSuccess: (_, userId) => {
			const target = (userId || "").toLowerCase();
			queryClient.setQueryData(["admin-users"], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.filter(
					(u: any) =>
						u &&
						u.id !== userId &&
						u.id?.toLowerCase() !== target &&
						(!u.email || u.email.toLowerCase() !== target)
				);
			});
			queryClient.setQueryData(["users"], (old: any) => {
				if (!Array.isArray(old)) return [];
				return old.filter(
					(u: any) =>
						u &&
						u.id !== userId &&
						u.id?.toLowerCase() !== target &&
						(!u.email || u.email.toLowerCase() !== target)
				);
			});
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}
