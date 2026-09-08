import { AlertTriangle, Loader2, X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { type UserDetailed, useUnassignProject } from "../../hooks/useUsers";
import { Portal } from "../ui/Portal";

interface RemoveProjectDialogProps {
	isOpen: boolean;
	onClose: () => void;
	user: UserDetailed;
	project: { id: string; name: string };
	activeTasksCount: number;
}

export default function RemoveProjectDialog({
	isOpen,
	onClose,
	user,
	project,
	activeTasksCount,
}: RemoveProjectDialogProps) {
	const [taskAction, setTaskAction] = useState<"keep" | "unassign">("unassign");
	const unassignProject = useUnassignProject();

	if (!isOpen) return null;

	const handleRemove = () => {
		unassignProject.mutate(
			{ userId: user.id, projectId: project.id, taskAction },
			{
				onSuccess: () => {
					toast.success(`Removed ${user.name} from ${project.name}`);
					onClose();
				},
				onError: () => {
					toast.error("Failed to remove member from project");
				},
			},
		);
	};

	return (
		<Portal>
			<div className="fixed inset-0 bg-[#33475B]/20 z-[110] flex items-center justify-center p-4">
				<div className="bg-white rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.12)] w-full max-w-md overflow-hidden border border-[#E0E3E8]">
					<div className="flex items-center justify-between p-6 border-b border-slate-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
								<AlertTriangle className="w-5 h-5 text-red-600" />
							</div>
							<h2 className="text-xl font-bold text-slate-900">
								Remove from Project
							</h2>
						</div>
						<button
							onClick={onClose}
							className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<div className="p-6">
						<p className="text-slate-700">
							Are you sure you want to remove <strong>{user.name}</strong> from{" "}
							<strong>{project.name}</strong>?
						</p>

						{activeTasksCount > 0 && (
							<div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
								<p className="text-sm text-amber-800 font-medium">
									This member currently has {activeTasksCount} active tasks in
									this project.
								</p>
								<p className="text-sm text-amber-700 mt-1">
									Removing them will prevent them from being assigned new tasks.
									What would you like to do with their existing tasks?
								</p>

								<div className="mt-4 flex flex-col gap-2">
									<label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
										<input
											type="radio"
											name="task_action"
											value="keep"
											checked={taskAction === "keep"}
											onChange={() => setTaskAction("keep")}
											className="text-indigo-600 focus:ring-indigo-500"
										/>
										Keep tasks assigned to {user.name}
									</label>
									<label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
										<input
											type="radio"
											name="task_action"
											value="unassign"
											checked={taskAction === "unassign"}
											onChange={() => setTaskAction("unassign")}
											className="text-indigo-600 focus:ring-indigo-500"
										/>
										Unassign tasks (move to unassigned)
									</label>
								</div>
							</div>
						)}
					</div>

					<div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
						<button
							onClick={onClose}
							className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
						>
							Cancel
						</button>
						<button
							className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
							onClick={handleRemove}
							disabled={unassignProject.isPending}
						>
							{unassignProject.isPending && (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							)}
							Remove Member
						</button>
					</div>
				</div>
			</div>
		</Portal>
	);
}
