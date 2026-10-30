import { format } from "date-fns";
import { Loader2, Lock, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
	type TaskComment,
	useComments,
	useCreateComment,
	useDeleteComment,
	useUpdateComment,
} from "@/hooks/useComments";

interface CommentsTabProps {
	taskId: string;
	isAssignee?: boolean;
}

function getInitials(name?: string): string {
	if (!name) return "U";
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name?: string): string {
	const colors = [
		"bg-blue-100 text-blue-700",
		"bg-emerald-100 text-emerald-700",
		"bg-purple-100 text-purple-700",
		"bg-amber-100 text-amber-700",
		"bg-rose-100 text-rose-700",
		"bg-indigo-100 text-indigo-700",
	];
	if (!name) return colors[0];
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return colors[Math.abs(hash) % colors.length];
}

export function CommentsTab({ taskId, isAssignee = false }: CommentsTabProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [newComment, setNewComment] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	const { data: session } = useSession();
	const currentUserId = (session?.user as any)?.id;
	const currentUserRole = (session?.user as any)?.role;
	const isAdmin = currentUserRole === "ADMIN";
	const canComment = isAdmin || isAssignee;

	const currentUserName = session?.user?.name || "User";
	const currentUserInitials = getInitials(currentUserName);

	// Live React Query hooks
	const { data: comments = [], isLoading } = useComments(taskId);
	const createCommentMutation = useCreateComment(taskId);
	const updateCommentMutation = useUpdateComment(taskId);
	const deleteCommentMutation = useDeleteComment(taskId);

	const handleAddComment = () => {
		if (!newComment.trim() || newComment === "<p></p>") return;
		createCommentMutation.mutate(newComment, {
			onSuccess: () => {
				setNewComment("");
				setIsExpanded(false);
				toast.success("Comment added successfully");
			},
			onError: (err: any) => {
				toast.error(err?.response?.data?.message || "Failed to add comment");
			},
		});
	};

	const startEdit = (comment: TaskComment) => {
		setEditingId(comment.id);
		setEditContent(comment.content);
	};

	const saveEdit = (commentId: string) => {
		if (!editContent.trim() || editContent === "<p></p>") return;
		updateCommentMutation.mutate(
			{ commentId, content: editContent },
			{
				onSuccess: () => {
					setEditingId(null);
					toast.success("Comment updated successfully");
				},
				onError: (err: any) => {
					toast.error(
						err?.response?.data?.message || "Failed to update comment",
					);
				},
			},
		);
	};

	const handleDelete = (commentId: string) => {
		deleteCommentMutation.mutate(commentId, {
			onSuccess: () => {
				setDeleteConfirmId(null);
				toast.success("Comment deleted");
			},
			onError: (err: any) => {
				toast.error(err?.response?.data?.message || "Failed to delete comment");
			},
		});
	};

	const formatCommentDate = (dateStr?: string) => {
		if (!dateStr) return "";
		try {
			return format(new Date(dateStr), "MMM d, h:mm a");
		} catch {
			return "";
		}
	};

	return (
		<div className="flex flex-col h-full space-y-6">
			<div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
				<MessageSquare className="w-5 h-5 text-gray-500 dark:text-slate-400" />
				<h3>Discussion</h3>
				{comments.length > 0 && (
					<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1A233A] text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-[#222F49]">
						{comments.length}
					</span>
				)}
			</div>

			{/* Comments List */}
			<div className="flex-1 space-y-6 overflow-y-auto pb-4">
				{isLoading ? (
					<div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-slate-400 space-x-2">
						<Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-sky-400" />
						<span>Loading discussion...</span>
					</div>
				) : comments.length === 0 ? (
					<div className="text-center py-10 text-sm text-gray-500 dark:text-slate-400">
						No comments yet. Be the first to start the discussion!
					</div>
				) : (
					comments.map((comment) => {
						const authorName = comment.author?.name || "Unknown User";
						const authorInitials = getInitials(authorName);
						const authorColor = getAvatarColor(authorName);
						const isAuthor =
							currentUserId &&
							comment.author?.id &&
							String(comment.author.id) === String(currentUserId);
						const canModify = isAuthor || isAdmin;

						return (
							<div key={comment.id} className="flex space-x-4">
								<div
									className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm ${authorColor}`}
								>
									{authorInitials}
								</div>
								<div className="flex-1 bg-white dark:bg-[#1A233A] border border-gray-200 dark:border-[#222F49] rounded-lg shadow-sm">
									<div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[#222F49] bg-gray-50/70 dark:bg-[#151D30] rounded-t-lg">
										<div className="flex items-center space-x-2">
											<span className="font-semibold text-sm text-gray-900 dark:text-slate-100">
												{authorName}
											</span>
											{comment.author?.role && (
												<span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700">
													{comment.author.role}
												</span>
											)}
											<span className="text-xs text-gray-500 dark:text-slate-300 font-medium">
												{formatCommentDate(comment.createdAt)}
											</span>
										</div>

										{canModify && (
											<div className="flex items-center space-x-3 text-xs font-semibold">
												<button
													type="button"
													onClick={() => startEdit(comment)}
													className="text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 hover:underline transition-colors"
												>
													Edit
												</button>
												<button
													type="button"
													onClick={() => setDeleteConfirmId(comment.id)}
													className="text-red-600 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-300 hover:underline transition-colors"
												>
													Delete
												</button>
											</div>
										)}
									</div>

									{editingId === comment.id ? (
										<div className="p-4 space-y-3">
											<div className="border border-gray-300 dark:border-[#222F49] rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white dark:bg-[#1A233A] shadow-sm">
												<RichTextEditor
													value={editContent}
													onChange={setEditContent}
													className="border-none rounded-none shadow-none focus-within:ring-0 focus-within:border-transparent min-h-[100px]"
												/>
											</div>
											<div className="flex space-x-2 justify-end">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => setEditingId(null)}
													disabled={updateCommentMutation.isPending}
												>
													Cancel
												</Button>
												<Button
													type="button"
													className="bg-blue-600 hover:bg-blue-700 text-white border-transparent"
													size="sm"
													onClick={() => saveEdit(comment.id)}
													disabled={
														updateCommentMutation.isPending ||
														!editContent ||
														editContent === "<p></p>" ||
														editContent === comment.content
													}
												>
													{updateCommentMutation.isPending
														? "Saving..."
														: "Save"}
												</Button>
											</div>
										</div>
									) : (
										<div
											className="px-4 py-3 text-sm text-gray-800 dark:text-slate-100 whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none"
											dangerouslySetInnerHTML={{ __html: comment.content }}
										/>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Add Comment Area */}
			{canComment ? (
				<div className="mt-auto border-t border-gray-200 dark:border-[#222F49] pt-4">
					<div className="flex space-x-4">
						<div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-sky-950 flex items-center justify-center font-semibold text-sm text-blue-700 dark:text-sky-300">
							{currentUserInitials}
						</div>
						<div className="flex-1">
							{!isExpanded ? (
								<div
									className="border border-gray-300 dark:border-[#222F49] rounded-lg overflow-hidden bg-white dark:bg-[#1A233A] px-4 py-2.5 text-sm text-gray-500 dark:text-slate-300 cursor-text hover:border-gray-400 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-slate-100 transition-colors"
									onClick={() => setIsExpanded(true)}
								>
									Add a comment... (Markdown & Rich Text supported)
								</div>
							) : (
								<div className="border border-gray-300 dark:border-[#222F49] rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white dark:bg-[#1A233A] shadow-sm transition-shadow">
									<RichTextEditor
										value={newComment}
										onChange={setNewComment}
										placeholder="Add a comment... (Markdown supported)"
										className="border-none rounded-none shadow-none focus-within:ring-0 focus-within:border-transparent"
									/>

									{/* Footer */}
									<div className="bg-gray-50 dark:bg-[#151D30] px-4 py-3 flex items-center justify-end border-t border-gray-200 dark:border-[#222F49]">
										<div className="flex space-x-2">
											<Button
												type="button"
												className="bg-green-600 hover:bg-green-700 text-white border-transparent"
												size="sm"
												onClick={handleAddComment}
												disabled={
													createCommentMutation.isPending ||
													!newComment ||
													newComment === "<p></p>"
												}
											>
												{createCommentMutation.isPending ? "Adding..." : "Add"}
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													setNewComment("");
													setIsExpanded(false);
												}}
												disabled={createCommentMutation.isPending}
											>
												Cancel
											</Button>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			) : (
				<div className="mt-auto border-t border-gray-200 dark:border-[#222F49] pt-4">
					<div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center space-x-2">
						<Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
						<span>
							Only the member assigned to this task (or an Admin) can add
							comments.
						</span>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirmId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
					<div className="bg-white dark:bg-[#131B2E] border border-gray-200 dark:border-[#222F49] rounded-xl shadow-2xl w-[400px] p-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
							Delete Comment
						</h3>
						<p className="text-sm text-gray-500 dark:text-slate-300 mb-6">
							Are you sure you want to delete this comment? This action cannot
							be undone.
						</p>
						<div className="flex justify-end space-x-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => setDeleteConfirmId(null)}
								disabled={deleteCommentMutation.isPending}
							>
								Cancel
							</Button>
							<Button
								type="button"
								className="bg-red-600 hover:bg-red-700 text-white border-transparent"
								onClick={() => handleDelete(deleteConfirmId)}
								disabled={deleteCommentMutation.isPending}
							>
								{deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
