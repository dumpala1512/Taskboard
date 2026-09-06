import {
	Calendar,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	FileText,
	Loader2,
	Settings,
	Users,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useCreateProject, useUpdateProject } from "../../hooks/useProjects";
import { useUsers } from "../../hooks/useUsers";
import type { Project } from "../../server/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Portal } from "../ui/Portal";

interface ProjectWizardModalProps {
	isOpen: boolean;
	onClose: () => void;
	project?: Project | null;
}

const STEPS = [
	"Project Information",
	"Team & Timeline",
	"Additional Details",
	"Review",
];

export function ProjectWizardModal({
	isOpen,
	onClose,
	project,
}: ProjectWizardModalProps) {
	const [step, setStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { data: users = [] } = useUsers();
	const createProject = useCreateProject();
	const updateProject = useUpdateProject();

	const [error, setError] = useState<string | null>(null);
	const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
	const [membersDropdownOpen, setMembersDropdownOpen] = useState(false);
	const [projectId, setProjectId] = useState<string | null>(null);

	// Form State
	const [formData, setFormData] = useState<Partial<Project>>({
		name: "",
		description: "",
		key: "",
		status: "PLANNING",
		progress: 0,
		ownerId: "",
		members: [],
		tags: [],
		startDate: "",
		dueDate: "",
	});
	const [tagInput, setTagInput] = useState("");

	const handleClose = () => {
		setStep(1);
		setError(null);
		setProjectId(null);
		setFormData({
			name: "",
			description: "",
			key: "",
			status: "PLANNING",
			progress: 0,
			ownerId: "",
			members: [],
			tags: [],
			startDate: "",
			dueDate: "",
		});
		setTagInput("");
		onClose();
	};

	useEffect(() => {
		if (isOpen) {
			setStep(1);
			setError(null);
			if (project) {
				setProjectId(project.id);
				setFormData({
					...project,
					startDate: project.startDate
						? new Date(project.startDate).toISOString().split("T")[0]
						: "",
					dueDate: project.dueDate
						? new Date(project.dueDate).toISOString().split("T")[0]
						: "",
				});
				setTagInput((project.tags || []).join(", "));
			} else {
				setProjectId(null);
				setFormData({
					name: "",
					description: "",
					key: "",
					status: "PLANNING",
					progress: 0,
					ownerId: "",
					members: [],
					tags: [],
					startDate: "",
					dueDate: "",
				});
				setTagInput("");
			}
		} else {
			setStep(1);
			setError(null);
			setProjectId(null);
			setFormData({
				name: "",
				description: "",
				key: "",
				status: "PLANNING",
				progress: 0,
				ownerId: "",
				members: [],
				tags: [],
				startDate: "",
				dueDate: "",
			});
			setTagInput("");
		}
	}, [isOpen, project]);

	// Set default ownerId once users are loaded, if it's not set
	useEffect(() => {
		if (isOpen && !project && !formData.ownerId && users && users.length > 0) {
			setFormData((prev) => ({ ...prev, ownerId: users[0].id }));
		}
	}, [isOpen, project, users, formData.ownerId]);

	if (!isOpen) return null;

	const isStep1Valid = !!(
		formData.name &&
		formData.description &&
		formData.status
	);
	const isStep2Valid = !!(formData.ownerId && formData.startDate);

	const handleNext = () => {
		setError(null);

		if (step === 1 && !isStep1Valid) {
			setError(
				"Please fill in all required fields (Name, Description, Status).",
			);
			return;
		}
		if (step === 2) {
			if (!formData.ownerId) {
				setError("Please select a project owner.");
				return;
			}
			if (!formData.startDate) {
				setError("Please select a project start date.");
				return;
			}
			if (
				formData.dueDate &&
				formData.startDate &&
				formData.dueDate < formData.startDate
			) {
				setError("Due date cannot be before start date.");
				return;
			}
		}

		if (step === 3) {
			const tags = formData.tags || [];
			if (tags.length > 10) {
				setError("You can add a maximum of 10 tags.");
				return;
			}
			const invalidTags = tags.filter((t) => t.length < 2 || t.length > 20);
			if (invalidTags.length > 0) {
				setError("Each tag must be between 2 and 20 characters long.");
				return;
			}
		}

		setStep((prev) => prev + 1);
	};

	const handleBack = () => {
		setError(null);
		setStep((prev) => Math.max(prev - 1, 1));
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);
		try {
			if (project) {
				await updateProject.mutateAsync({
					id: project.id,
					...formData,
				} as any);
				toast.success("Project updated successfully");
			} else {
				await createProject.mutateAsync(formData as any);
				toast.success("Project created successfully");
			}
			handleClose();
		} catch (err: any) {
			setError(err.message || "Failed to save project.");
			toast.error("Failed to save project");
		} finally {
			setIsSubmitting(false);
		}
	};

	const toggleMember = (userId: string) => {
		setFormData((prev) => {
			const members = prev.members || [];
			if (members.includes(userId)) {
				return { ...prev, members: members.filter((id) => id !== userId) };
			}
			return { ...prev, members: [...members, userId] };
		});
	};

	// Close dropdowns when clicking outside (simple approach for modal: just close when clicking elsewhere)
	// We'll use a basic toggle pattern for now.

	return (
		<Portal>
			<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#33475B]/20 backdrop-blur-sm overflow-y-auto">
				<div className="bg-white dark:bg-[#131B2E] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-[#E0E3E8] dark:border-[#222F49] w-full max-w-3xl flex flex-col my-8 h-[700px] max-h-[90vh]">
					{/* Header */}
					<div className="flex justify-between items-center px-6 py-4 border-b border-[#E0E3E8] dark:border-[#222F49] bg-white dark:bg-[#131B2E] rounded-t-[6px]">
						<div>
							<h3 className="text-lg font-semibold text-[#33475B] dark:text-slate-100">
								{project ? "Edit Project" : "Create New Project"}
							</h3>
							<p className="text-sm text-gray-500 dark:text-slate-400">Step {step} of 4</p>
						</div>
						<button
							onClick={handleClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-1"
							disabled={isSubmitting}
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Progress Bar */}
					<div className="px-10 sm:px-16 pt-4 pb-12 shrink-0">
						<div className="flex items-center justify-between relative">
							<div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
							<div
								className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-300 rounded-full"
								style={{ width: `${((step - 1) / 3) * 100}%` }}
							/>
							{STEPS.map((label, i) => (
								<div
									key={label}
									className="relative z-10 flex flex-col items-center"
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors border-2
										${
											step > i + 1
												? "bg-indigo-600 border-indigo-600 text-white"
												: step === i + 1
													? "bg-white dark:bg-[#131B2E] border-indigo-600 text-indigo-600 dark:text-indigo-400"
													: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
										}`}
									>
										{i + 1}
									</div>
									<span
										className={`absolute top-10 text-xs whitespace-nowrap hidden sm:block font-medium
									${step >= i + 1 ? "text-slate-900 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}
									>
										{label}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Content */}
					<div
						className="p-6 overflow-y-auto flex-grow"
						onClick={() => {
							// Close dropdowns when clicking on the background
							if (ownerDropdownOpen) setOwnerDropdownOpen(false);
							if (membersDropdownOpen) setMembersDropdownOpen(false);
						}}
					>
						{error && (
							<div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
								{error}
							</div>
						)}

						{/* STEP 1: Basic Info */}
						{step === 1 && (
							<div
								className="space-y-5 animate-in fade-in slide-in-from-right-4"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex items-center gap-3 mb-6">
									<div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
										<FileText className="w-5 h-5" />
									</div>
									<div>
										<h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
											Project Information
										</h4>
										<p className="text-sm text-gray-500 dark:text-slate-400">
											Basic details about the project.
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<div className="sm:col-span-2">
										<Input
											label="Project Name *"
											placeholder="e.g. Website Redesign"
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
											maxLength={100}
										/>
									</div>

									<Input
										label="Project Key"
										placeholder="e.g. WEB"
										value={formData.key}
										onChange={(e) =>
											setFormData({ ...formData, key: e.target.value })
										}
										maxLength={20}
									/>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
											Status *
										</label>
										<select
											className="w-full px-3 py-2 bg-white dark:bg-[#1A233A] border border-gray-300 dark:border-[#222F49] rounded-lg text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
											value={formData.status}
											onChange={(e) =>
												setFormData({
													...formData,
													status: e.target.value as any,
												})
											}
										>
											<option value="PLANNING" className="dark:bg-[#1A233A]">Planning</option>
											<option value="ACTIVE" className="dark:bg-[#1A233A]">Active</option>
											<option value="ON_HOLD" className="dark:bg-[#1A233A]">On Hold</option>
											<option value="COMPLETED" className="dark:bg-[#1A233A]">Completed</option>
										</select>
									</div>

									<div className="sm:col-span-2">
										<label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
											Description *
										</label>
										<textarea
											className="w-full px-3 py-2 bg-white dark:bg-[#1A233A] border border-gray-300 dark:border-[#222F49] rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors min-h-[100px]"
											placeholder="Briefly describe the project goals..."
											value={formData.description}
											onChange={(e) =>
												setFormData({
													...formData,
													description: e.target.value,
												})
											}
											maxLength={1000}
										/>
									</div>
								</div>
							</div>
						)}

						{/* STEP 2: Team & Timeline */}
						{step === 2 && (
							<div
								className="space-y-5 animate-in fade-in slide-in-from-right-4"
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex items-center gap-3 mb-6">
									<div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
										<Users className="w-5 h-5" />
									</div>
									<div>
										<h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
											Team & Timeline
										</h4>
										<p className="text-sm text-gray-500 dark:text-slate-400">
											Assign members and set a due date.
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative">
									<div className="sm:col-span-2 relative">
										<label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
											Project Owner *
										</label>
										<button
											type="button"
											onClick={() => {
												setOwnerDropdownOpen(!ownerDropdownOpen);
												setMembersDropdownOpen(false);
											}}
											className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#1A233A] border border-gray-300 dark:border-[#222F49] rounded-lg text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-left"
										>
											{formData.ownerId ? (
												<span className="flex items-center gap-2">
													<div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-slate-300">
														{users
															.find((u) => u.id === formData.ownerId)
															?.name?.charAt(0)}
													</div>
													{users.find((u) => u.id === formData.ownerId)?.name}
												</span>
											) : (
												<span className="text-gray-500 dark:text-slate-400">Select an owner</span>
											)}
											<ChevronRight
												className={`w-4 h-4 text-gray-400 transition-transform ${ownerDropdownOpen ? "rotate-90" : ""}`}
											/>
										</button>

										{ownerDropdownOpen && (
											<div className="absolute z-10 mt-1 w-full border border-gray-200 dark:border-[#222F49] rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-[#131B2E] p-2 space-y-1 shadow-lg">
												{users.map((u) => (
													<label
														key={u.id}
														className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${formData.ownerId === u.id ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" : "border-transparent hover:bg-gray-50 dark:hover:bg-[#1A233A]"}`}
													>
														<input
															type="radio"
															name="owner"
															className="text-indigo-600 focus:ring-indigo-500"
															checked={formData.ownerId === u.id}
															onChange={() => {
																setFormData({ ...formData, ownerId: u.id });
																setOwnerDropdownOpen(false); // Close after selection
															}}
														/>
														<div className="flex items-center gap-2">
															<div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-slate-300">
																{u.name.charAt(0)}
															</div>
															<span className="text-sm text-gray-700 dark:text-slate-200">
																{u.name} ({u.email})
															</span>
														</div>
													</label>
												))}
											</div>
										)}
									</div>

									<div className="sm:col-span-2 relative">
										<label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
											Team Members
										</label>
										<button
											type="button"
											onClick={() => {
												setMembersDropdownOpen(!membersDropdownOpen);
												setOwnerDropdownOpen(false);
											}}
											className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#1A233A] border border-gray-300 dark:border-[#222F49] rounded-lg text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-left"
										>
											<span className="truncate">
												{formData.members && formData.members.length > 0 ? (
													`${formData.members.length} member${formData.members.length > 1 ? "s" : ""} selected`
												) : (
													<span className="text-gray-500 dark:text-slate-400">
														Select team members
													</span>
												)}
											</span>
											<ChevronRight
												className={`w-4 h-4 text-gray-400 transition-transform ${membersDropdownOpen ? "rotate-90" : ""}`}
											/>
										</button>

										{membersDropdownOpen && (
											<div className="absolute z-10 mt-1 w-full border border-gray-200 dark:border-[#222F49] rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-[#131B2E] p-2 space-y-1 shadow-lg">
												{users
													.filter((u) => u.id !== formData.ownerId)
													.map((u) => (
														<label
															key={u.id}
															className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-[#1A233A] rounded cursor-pointer border border-transparent"
														>
															<input
																type="checkbox"
																className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
																checked={(formData.members || []).includes(
																	u.id,
																)}
																onChange={() => toggleMember(u.id)}
															/>
															<div className="flex items-center gap-2">
																<div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-slate-300">
																	{u.name.charAt(0)}
																</div>
																<span className="text-sm text-gray-700 dark:text-slate-200">
																	{u.name}
																</span>
															</div>
														</label>
													))}
												<div className="pt-2 text-right">
													<Button
														variant="ghost"
														className="text-xs py-1 px-2"
														onClick={() => setMembersDropdownOpen(false)}
													>
														Done
													</Button>
												</div>
											</div>
										)}
									</div>

									<div className="sm:col-span-1">
										<Input
											label="Start Date"
											type="date"
											required
											value={formData.startDate || ""}
											onChange={(e) =>
												setFormData({ ...formData, startDate: e.target.value })
											}
										/>
									</div>

									<div className="sm:col-span-1">
										<Input
											label="Target Due Date"
											type="date"
											value={formData.dueDate || ""}
											onChange={(e) =>
												setFormData({ ...formData, dueDate: e.target.value })
											}
										/>
									</div>
								</div>
							</div>
						)}

						{/* STEP 3: Details */}
						{step === 3 && (
							<div className="space-y-5 animate-in fade-in slide-in-from-right-4">
								<div className="flex items-center gap-3 mb-6">
									<div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
										<Settings className="w-5 h-5" />
									</div>
									<div>
										<h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
											Additional Details
										</h4>
										<p className="text-sm text-gray-500 dark:text-slate-400">
											Configure tags and extra project settings.
										</p>
									</div>
								</div>

								<div className="space-y-5">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
											Project Tags (comma separated)
										</label>
										<input
											type="text"
											className="w-full px-3 py-2 bg-white dark:bg-[#1A233A] border border-gray-300 dark:border-[#222F49] rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
											placeholder="e.g. Frontend, API, Q3, Important"
											value={tagInput}
											onChange={(e) => {
												setTagInput(e.target.value);
												const tags = e.target.value
													.split(",")
													.map((t) => t.trim())
													.filter(Boolean);
												setFormData({ ...formData, tags });
											}}
										/>
										<p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
											These help in searching and filtering projects.
										</p>
									</div>
								</div>
							</div>
						)}

						{/* STEP 4: Review */}
						{step === 4 && (
							<div className="space-y-5 animate-in fade-in slide-in-from-right-4">
								<div className="flex items-center gap-3 mb-6">
									<div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
										<CheckCircle2 className="w-5 h-5" />
									</div>
									<div>
										<h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
											Review & Submit
										</h4>
										<p className="text-sm text-gray-500 dark:text-slate-400">
											Verify the details before saving.
										</p>
									</div>
								</div>

								<div className="bg-gray-50 dark:bg-[#1A233A] rounded-lg p-5 border border-gray-100 dark:border-[#222F49] space-y-4">
									<div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-[#222F49]">
										<div className="col-span-1 font-medium text-sm text-gray-900 dark:text-slate-200">
											Name
										</div>
										<div className="col-span-2 text-gray-700 dark:text-slate-300 break-all">
											{formData.name}
										</div>
									</div>
									<div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-[#222F49]">
										<div className="col-span-1 font-medium text-sm text-gray-900 dark:text-slate-200">
											Key
										</div>
										<div className="col-span-2 text-gray-700 dark:text-slate-300 break-all">
											{formData.key || "Auto-generated"}
										</div>
									</div>
									<div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-[#222F49]">
										<div className="col-span-1 font-medium text-sm text-gray-900 dark:text-slate-200">
											Status
										</div>
										<div className="col-span-2 text-gray-700 dark:text-slate-300">
											<span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-white dark:bg-[#131B2E] text-gray-700 dark:text-slate-200 ring-gray-200 dark:ring-slate-700">
												{formData.status}
											</span>
										</div>
									</div>
									<div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-[#222F49]">
										<div className="col-span-1 font-medium text-sm text-gray-900 dark:text-slate-200">
											Owner
										</div>
										<div className="col-span-2 text-gray-700 dark:text-slate-300 break-all">
											{users.find((u) => u.id === formData.ownerId)?.name ||
												"Unknown"}
										</div>
									</div>
									<div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-[#222F49]">
										<div className="col-span-1 font-medium text-sm text-gray-900 dark:text-slate-200">
											Timeline
										</div>
										<div className="col-span-2 text-gray-700 dark:text-slate-300">
											{formData.startDate
												? new Date(formData.startDate).toLocaleDateString()
												: "Not set"}{" "}
											—{" "}
											{formData.dueDate
												? new Date(formData.dueDate).toLocaleDateString()
												: "Ongoing"}
										</div>
									</div>
									<div className="grid grid-cols-3 gap-4">
										<div className="col-span-1 font-medium text-sm text-gray-900 dark:text-slate-200">
											Members
										</div>
										<div className="col-span-2 text-gray-700 dark:text-slate-300">
											{formData.members?.length || 0} selected
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Footer Controls */}
					<div className="px-6 py-4 border-t border-[#E0E3E8] dark:border-[#222F49] bg-[#F8FAFC] dark:bg-[#0E1526] rounded-b-md flex items-center justify-between shrink-0">
						<Button
							variant="secondary"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>

						<div className="flex items-center gap-3">
							{step > 1 && (
								<Button
									variant="secondary"
									onClick={handleBack}
									disabled={isSubmitting}
									leftIcon={<ChevronLeft className="w-4 h-4" />}
								>
									Back
								</Button>
							)}

							{step < 4 ? (
								<Button
									variant="primary"
									onClick={handleNext}
									disabled={
										isSubmitting ||
										(step === 1 && !isStep1Valid) ||
										(step === 2 && !isStep2Valid)
									}
									rightIcon={
										isSubmitting ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<ChevronRight className="w-4 h-4" />
										)
									}
								>
									{isSubmitting ? "Saving..." : "Continue"}
								</Button>
							) : (
								<Button
									variant="primary"
									onClick={handleSubmit}
									disabled={isSubmitting}
									leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
								>
									{project ? "Save Changes" : "Create Project"}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</Portal>
	);
}
