// Comment hooks for task discussions
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/axios";

export interface CommentAuthor {
	id: string;
	name: string;
	role: string;
}

export interface TaskComment {
	id: string;
	content: string;
	createdAt: string;
	updatedAt: string;
	author?: CommentAuthor;
}

export function useComments(taskId?: string) {
	return useQuery({
		queryKey: ["comments", taskId],
		queryFn: async (): Promise<TaskComment[]> => {
			if (!taskId) return [];
			const response = await apiClient.get(`/tasks/${taskId}/comments`);
			const list = response.data?.data || response.data || [];
			return Array.isArray(list) ? list : [];
		},
		enabled: Boolean(taskId),
	});
}

export function useCreateComment(taskId?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (content: string) => {
			const response = await apiClient.post(`/tasks/${taskId}/comments`, {
				content,
			});
			return response.data?.data || response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useUpdateComment(taskId?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			commentId,
			content,
		}: {
			commentId: string;
			content: string;
		}) => {
			const response = await apiClient.patch(`/comments/${commentId}`, {
				content,
			});
			return response.data?.data || response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
		},
	});
}

export function useDeleteComment(taskId?: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (commentId: string) => {
			await apiClient.delete(`/comments/${commentId}`);
			return commentId;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

