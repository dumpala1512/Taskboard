import {
	AlertCircle,
	Briefcase,
	CheckCircle2,
	Circle,
	Clock,
	Trash2,
	X,
} from "lucide-react";
import React from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useDeleteUser, type UserDetailed } from "../../hooks/useUsers";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import AssignProjectModal from "./AssignProjectModal";
import RemoveProjectDialog from "./RemoveProjectDialog";

interface MemberProfileDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	user: UserDetailed | null;
}

import { Portal } from "../ui/Portal";

export default function MemberProfileDrawer({
	isOpen,
	onClose,
	user,
}: MemberProfileDrawerProps) {
	const { data: session } = useSession();
	const deleteUser = useDeleteUser();
	const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
	const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false);
	const [projectToRemove, setProjectToRemove] = React.useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

	const handleDeleteUser = async () => {
		if (!user) return;
		try {
			await deleteUser.mutateAsync(user.id);
			toast.success("User deleted successfully");
			setIsDeleteDialogOpen(false);
			onClose();
		} catch (error: any) {
			toast.error(
				error?.response?.data?.message ||
					error.message ||
					"Failed to delete user",
			);
		}
	};

	if (!isOpen || !user) return null;

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "DONE":
				return <CheckCircle2 className="w-4 h-4 text-green-500" />;
			case "IN_PROGRESS":
				return <Clock className="w-4 h-4 text-blue-500" />;
			case "REVIEW":
				return <AlertCircle className="w-4 h-4 text-amber-500" />;
			default:
				return <Circle className="w-4 h-4 text-slate-300" />;
		}
	};

	return (
		<Portal>
			<div
				className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] transition-opacity"
				onClick={onClose}
			/>

			<div className="fixed inset-y-0 right-0 w-full sm:w-1/2 bg-white shadow-2xl z-[101] transform transition-transform duration-300 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-200">
					<h2 className="text-lg font-semibold text-slate-900">
						Member Profile
					</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-8">
					{/* Profile Info */}
					<div className="flex items-start gap-4">
						<img
							src={
								user.avatar ||
								`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e0e7ff&color=4f46e5&size=80`
							}
							alt={user.name}
							className="w-20 h-20 rounded-full border border-slate-200 shrink-0"
						/>
						<div className="min-w-0 flex-1">
							<h3 className="text-xl font-bold text-slate-900 truncate">{user.name}</h3>
							<p className="text-sm text-slate-500 truncate">{user.email}</p>
							<div className="mt-2 flex flex-wrap gap-2">
								<span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-700">
									Projects Assigned: {user.projectsAssigned}
								</span>
								<span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-700">
									Tasks Assigned: {user.tasksAssigned}
								</span>
							</div>
						</div>
					</div>

					{/* Assigned Projects */}
					<div>
						<div className="flex items-center justify-between mb-3">
							<h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
								Assigned Projects ({user.projectsAssigned})
							</h4>
						</div>

						{user.assignedProjectsList.length === 0 ? (
							<p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-center border border-slate-100">
								No projects assigned.
							</p>
						) : (
							<div className="space-y-2">
								{user.assignedProjectsList.map((project) => (
									<div
										key={project.id}
										className="flex flex-col p-3 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0 flex-1">
												<Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
												<span className="text-sm font-medium text-slate-900 truncate">
													{project.name}
												</span>
											</div>
											<div className="flex items-center gap-3 shrink-0">
												<span className="text-xs text-slate-500">
													{project.status}
												</span>
												<button
													className="text-xs text-red-600 hover:text-red-700 font-medium"
													onClick={() => {
														setProjectToRemove(project);
														setIsRemoveDialogOpen(true);
													}}
												>
													Remove
												</button>
											</div>
										</div>
										<div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
											<div
												className="bg-indigo-500 h-1.5 rounded-full"
												style={{ width: `${project.progress}%` }}
											></div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Assigned Tasks */}
					<div>
						<h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
							Recent Tasks ({user.tasksAssigned})
						</h4>
						{user.assignedTasksList.length === 0 ? (
							<p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-center border border-slate-100">
								No tasks assigned.
							</p>
						) : (
							<div className="space-y-2">
								{user.assignedTasksList.slice(0, 5).map((task) => (
									<div
										key={task.id}
										className="flex items-start justify-between p-3 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors gap-2"
									>
										<div className="flex items-start gap-2 flex-1 min-w-0">
											<div className="mt-0.5">{getStatusIcon(task.status)}</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-slate-900 truncate">
													{task.title}
												</p>
												<p className="text-xs text-slate-500 truncate mt-0.5">
													Project ID: {task.projectId}
												</p>
											</div>
										</div>
										{task.dueDate && (
											<span className="text-xs text-slate-400 whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded">
												Due: {new Date(task.dueDate).toLocaleDateString()}
											</span>
										)}
									</div>
								))}
								{user.tasksAssigned > 5 && (
									<p className="text-xs text-center text-slate-500 pt-2">
										And {user.tasksAssigned - 5} more tasks...
									</p>
								)}
							</div>
						)}
					</div>

					{/* Danger Zone */}
					{session?.user?.email !== user.email && (
						<div className="pt-6 mt-6 border-t border-red-100">
							<h4 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-3">
								Danger Zone
							</h4>
							<div className="bg-red-50 p-4 rounded-lg border border-red-100">
								<p className="text-sm text-red-800 mb-3">
									Deleting this user will permanently remove them from the system.
									This action cannot be undone.
								</p>
								<button
									onClick={() => setIsDeleteDialogOpen(true)}
									className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
								>
									<Trash2 className="w-4 h-4" />
									Delete User
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			<AssignProjectModal
				isOpen={isAssignModalOpen}
				onClose={() => setIsAssignModalOpen(false)}
				user={user}
			/>

			{projectToRemove && (
				<RemoveProjectDialog
					isOpen={isRemoveDialogOpen}
					onClose={() => {
						setIsRemoveDialogOpen(false);
						setProjectToRemove(null);
					}}
					user={user}
					project={projectToRemove}
					activeTasksCount={
						user.assignedTasksList.filter(
							(t) => t.projectId === projectToRemove.id && t.status !== "DONE",
						).length
					}
				/>
			)}

			<ConfirmDialog
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteUser}
				title="Delete User"
				description={`Are you sure you want to delete ${user?.name}? This action cannot be undone and they will lose access to all projects and tasks.`}
				confirmText="Delete User"
				cancelText="Cancel"
				isProcessing={deleteUser.isPending}
			/>
		</Portal>
	);
}
