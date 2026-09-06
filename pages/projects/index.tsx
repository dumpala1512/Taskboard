import {
	Filter,
	Folder,
	LayoutGrid,
	List as ListIcon,
	Plus,
	Search,
} from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { AppLayout } from "../../components/layout/AppLayout";
import { ArchiveProjectDialog } from "../../components/projects/ArchiveProjectDialog";
import { DeleteProjectDialog } from "../../components/projects/DeleteProjectDialog";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { ProjectTable } from "../../components/projects/ProjectTable";
import { ProjectWizardModal } from "../../components/projects/ProjectWizardModal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import {
	useCreateProject,
	useDeleteProject,
	useProjects,
	useUpdateProject,
} from "../../hooks/useProjects";
import type { Project } from "../../server/types";

export default function ProjectsPage() {
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";

	// View State
	const [view, setView] = useState<"grid" | "table">("grid");

	// Filter & Search State
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");

	// Data Fetching
	const { data: allProjects = [], isLoading, error } = useProjects();
	const projects = allProjects.filter((p) => {
		const matchesSearch =
			!searchQuery ||
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(p.key && p.key.toLowerCase().includes(searchQuery.toLowerCase()));
		const matchesStatus = !statusFilter || p.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	// Mutations
	const createProject = useCreateProject();
	const updateProject = useUpdateProject();
	const deleteProject = useDeleteProject();

	// Modal States
	const [wizardOpen, setWizardOpen] = useState(false);
	const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
	const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
	const [projectToArchive, setProjectToArchive] = useState<Project | null>(
		null,
	);

	// Stats
	const totalProjects = projects.length;
	const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
	const completedProjects = projects.filter(
		(p) => p.status === "COMPLETED",
	).length;
	const onHoldProjects = projects.filter((p) => p.status === "ON_HOLD").length;

	// Handlers

	const handleDeleteProject = async (id: string) => {
		try {
			await deleteProject.mutateAsync(id);
			toast.success("Project deleted successfully");
		} catch (error) {
			toast.error("Failed to delete project");
		}
	};

	const handleArchiveProject = async (id: string) => {
		try {
			await updateProject.mutateAsync({ id, status: "ARCHIVED" as any });
			toast.success("Project archived successfully");
		} catch (error) {
			toast.error("Failed to archive project");
		}
	};

	if (isLoading) {
		return (
			<AppLayout>
				<div className="w-full space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
						<div>
							<Skeleton className="h-8 w-40 mb-2" />
							<Skeleton className="h-4 w-64" />
						</div>
						{isAdmin && <Skeleton className="h-10 w-36" />}
					</div>

					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
							>
								<Skeleton className="h-4 w-24 mb-2" />
								<Skeleton className="h-8 w-12" />
							</div>
						))}
					</div>

					<Skeleton className="h-16 w-full rounded-xl mb-6" />

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div
								key={i}
								className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[220px]"
							>
								<Skeleton className="h-6 w-3/4 mb-4" />
								<Skeleton className="h-4 w-full mb-2" />
								<Skeleton className="h-4 w-full mb-2" />
								<Skeleton className="h-4 w-2/3 mb-6" />
								<div className="flex gap-2">
									<Skeleton className="h-6 w-16 rounded-full" />
									<Skeleton className="h-6 w-16 rounded-full" />
								</div>
							</div>
						))}
					</div>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<div className="w-full space-y-4">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
							<Folder className="w-6 h-6 text-indigo-600" />
							Projects
						</h1>
						<p className="text-sm text-gray-500 mt-1">
							Manage and track your team's initiatives.
						</p>
					</div>

					{isAdmin && (
						<Button
							variant="primary"
							leftIcon={<Plus className="w-5 h-5" />}
							onClick={() => {
								setProjectToEdit(null);
								setWizardOpen(true);
							}}
						>
							Create Project
						</Button>
					)}
				</div>

				{/* Stats Row */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
						<p className="text-sm font-medium text-gray-500">Total Projects</p>
						<p className="text-2xl font-bold text-gray-900 mt-2">
							{totalProjects}
						</p>
					</div>
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
						<p className="text-sm font-medium text-emerald-600">Active</p>
						<p className="text-2xl font-bold text-gray-900 mt-2">
							{activeProjects}
						</p>
					</div>
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
						<p className="text-sm font-medium text-gray-600">Completed</p>
						<p className="text-2xl font-bold text-gray-900 mt-2">
							{completedProjects}
						</p>
					</div>
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
						<p className="text-sm font-medium text-amber-600">On Hold</p>
						<p className="text-2xl font-bold text-gray-900 mt-2">
							{onHoldProjects}
						</p>
					</div>
				</div>

				{/* Filters and Controls */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
					<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
						<div className="w-full sm:w-72">
							<Input
								leftIcon={<Search className="w-4 h-4 text-gray-400" />}
								placeholder="Search projects..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<div className="w-full sm:w-48 relative">
							<Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
							<select
								className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
							>
								<option value="">All Statuses</option>
								<option value="PLANNING">Planning</option>
								<option value="ACTIVE">Active</option>
								<option value="ON_HOLD">On Hold</option>
								<option value="COMPLETED">Completed</option>
								{isAdmin && <option value="ARCHIVED">Archived</option>}
							</select>
						</div>
					</div>

					<div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
						<button
							onClick={() => setView("grid")}
							className={`p-1.5 rounded-md transition-colors ${
								view === "grid"
									? "bg-white text-indigo-600 shadow-sm"
									: "text-gray-500 hover:text-gray-900"
							}`}
						>
							<LayoutGrid className="w-4 h-4" />
						</button>
						<button
							onClick={() => setView("table")}
							className={`p-1.5 rounded-md transition-colors ${
								view === "table"
									? "bg-white text-indigo-600 shadow-sm"
									: "text-gray-500 hover:text-gray-900"
							}`}
						>
							<ListIcon className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Error State */}
				{error && (
					<div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
						Failed to load projects. Please try again later.
					</div>
				)}

				{/* Content */}
				{projects.length === 0 ? (
					<div className="bg-white rounded-xl border border-gray-200 border-dashed">
						<EmptyState
							icon={Folder}
							title="No projects found"
							description={
								searchQuery || statusFilter
									? "Try adjusting your search or filters to find what you're looking for."
									: isAdmin
										? "Get started by creating your first project to track tasks and collaborate."
										: "You haven't been assigned to any projects yet."
							}
							action={
								isAdmin && !searchQuery && !statusFilter
									? {
											label: "Create First Project",
											onClick: () => {
												setProjectToEdit(null);
												setWizardOpen(true);
											},
										}
									: undefined
							}
						/>
					</div>
				) : view === "grid" ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<ProjectCard
								key={project.id}
								project={project}
								onEdit={(p) => {
									setProjectToEdit(p);
									setWizardOpen(true);
								}}
								onArchive={setProjectToArchive}
								onDelete={setProjectToDelete}
							/>
						))}
					</div>
				) : (
					<ProjectTable
						projects={projects}
						onEdit={(p) => {
							setProjectToEdit(p);
							setWizardOpen(true);
						}}
						onArchive={setProjectToArchive}
						onDelete={setProjectToDelete}
					/>
				)}

				{/* Modals */}
				{isAdmin && (
					<>
						<ProjectWizardModal
							isOpen={wizardOpen}
							onClose={() => setWizardOpen(false)}
							project={projectToEdit}
						/>
						<DeleteProjectDialog
							isOpen={!!projectToDelete}
							project={projectToDelete}
							onClose={() => setProjectToDelete(null)}
							onConfirm={handleDeleteProject}
						/>
						<ArchiveProjectDialog
							isOpen={!!projectToArchive}
							project={projectToArchive}
							onClose={() => setProjectToArchive(null)}
							onConfirm={handleArchiveProject}
						/>
					</>
				)}
			</div>
		</AppLayout>
	);
}
