import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { type UserDetailed, useAssignProjects } from "../../hooks/useUsers";
import { apiClient } from "../../lib/axios";

interface AssignProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
	user: UserDetailed;
}

export default function AssignProjectModal({
	isOpen,
	onClose,
	user,
}: AssignProjectModalProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const assignProjects = useAssignProjects();

	const { data: projects = [], isLoading } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const res = await apiClient.get("/projects");
			return res.data;
		},
		enabled: isOpen,
	});

	useEffect(() => {
		if (!isOpen) {
			setSelectedIds(new Set());
			setSearchTerm("");
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const availableProjects = projects.filter(
		(p: any) =>
			!user.assignedProjectsList.some((ap) => ap.id === p.id) &&
			p.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleToggle = (id: string) => {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) newSet.delete(id);
		else newSet.add(id);
		setSelectedIds(newSet);
	};

	const handleAssign = () => {
		if (selectedIds.size === 0) return;

		assignProjects.mutate(
			{ userId: user.id, projectIds: Array.from(selectedIds) },
			{
				onSuccess: () => {
					toast.success(
						`Successfully assigned to ${selectedIds.size} project(s)`,
					);
					onClose();
				},
				onError: () => {
					toast.error("Failed to assign projects");
				},
			},
		);
	};

	return (
		<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
				<div className="flex items-center justify-between p-6 border-b border-slate-200">
					<div>
						<h2 className="text-xl font-bold text-slate-900">
							Assign Projects
						</h2>
						<p className="text-sm text-slate-500 mt-1">
							Assign projects to {user.name}
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 border-b border-slate-200 bg-slate-50">
					<div className="relative">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
						<input
							type="text"
							placeholder="Search available projects..."
							className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-2">
					{isLoading ? (
						<div className="flex justify-center p-8">
							<Loader2 className="animate-spin w-6 h-6 text-indigo-600" />
						</div>
					) : availableProjects.length === 0 ? (
						<div className="text-center p-8 text-slate-500 text-sm">
							No available projects found.
						</div>
					) : (
						<div className="space-y-1">
							{availableProjects.map((project: any) => (
								<label
									key={project.id}
									className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200"
								>
									<div>
										<p className="text-sm font-medium text-slate-900">
											{project.name}
										</p>
										<p className="text-xs text-slate-500 mt-0.5">
											{project.status}
										</p>
									</div>
									<input
										type="checkbox"
										className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
										checked={selectedIds.has(project.id)}
										onChange={() => handleToggle(project.id)}
									/>
								</label>
							))}
						</div>
					)}
				</div>

				<div className="p-6 border-t border-slate-200 flex justify-end bg-slate-50">
					<button
						className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
						onClick={handleAssign}
						disabled={selectedIds.size === 0 || assignProjects.isPending}
					>
						{assignProjects.isPending && (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						)}
						Assign Selected
					</button>
				</div>
			</div>
		</div>
	);
}
