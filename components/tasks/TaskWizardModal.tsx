import { ChevronLeft, ChevronRight, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Portal } from "../ui/Portal";
import { toast } from "react-hot-toast";
import { useCreateTask, useUpdateTask } from "../../hooks/useTasks";
import { useProjects } from "../../hooks/useProjects";
import type { Task } from "../../server/types";
import { Button } from "../ui/Button";
import { Step1BasicInfo } from "./wizard/Step1BasicInfo";
import { Step2Assignment } from "./wizard/Step2Assignment";
import { Step3Details } from "./wizard/Step3Details";
import { Step4Review } from "./wizard/Step4Review";

interface TaskWizardModalProps {
	isOpen: boolean;
	onClose: () => void;
	taskToEdit?: Task | null;
	initialProjectId?: string;
}

const STEPS = ["Basic Information", "Assignment", "Details", "Review"];

export function TaskWizardModal({
	isOpen,
	onClose,
	taskToEdit,
	initialProjectId,
}: TaskWizardModalProps) {
	const [step, setStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const { data: projects = [] } = useProjects();
	const createTask = useCreateTask();
	const updateTask = useUpdateTask();
	const router = useRouter();

	const initialFormData = {
		title: "",
		description: "",
		projectId: initialProjectId || "",
		priority: "MEDIUM",
		taskType: "",
		assigneeId: "",
		status: "TODO",
		startDate: "",
		dueDate: "",
		estimatedTime: null as number | null,
		tags: [],
		attachments: [],
		notes: "",
		isDraft: false,
	};

	const [formData, setFormData] = useState<any>(initialFormData);

	useEffect(() => {
		setStep(1);
		setErrors({});

		if (isOpen) {
			if (taskToEdit) {
				setFormData({
					...initialFormData,
					...taskToEdit,
					dueDate: taskToEdit.dueDate
						? new Date(taskToEdit.dueDate).toISOString().split("T")[0]
						: "",
					startDate: taskToEdit.startDate
						? new Date(taskToEdit.startDate).toISOString().split("T")[0]
						: "",
				});
			} else {
				setFormData(initialFormData);
			}
		} else {
			setFormData(initialFormData);
		}
	}, [isOpen, taskToEdit]);

	if (!isOpen) return null;

	const validateStep = (currentStep: number) => {
		const newErrors: Record<string, string> = {};

		if (currentStep === 1) {
			if (!formData.projectId) newErrors.projectId = "Project is required";
			if (!formData.title?.trim()) {
				newErrors.title = "Title is required";
			} else if (formData.title.length < 3 || formData.title.length > 150) {
				newErrors.title = "Title must be between 3 and 150 characters";
			}
			if (!formData.description?.trim()) {
				newErrors.description = "Description is required";
			} else if (
				formData.description.length < 10 ||
				formData.description.length > 2000
			) {
				newErrors.description =
					"Description must be between 10 and 2000 characters";
			}
			if (!formData.priority) newErrors.priority = "Priority is required";
		}

		if (currentStep === 2 || currentStep === 4) {
			if (!formData.status) newErrors.status = "Status is required";
			if (!formData.startDate) newErrors.startDate = "Start date is required";
			if (!formData.dueDate) newErrors.dueDate = "Due date is required";

			if (formData.startDate && formData.dueDate) {
				const start = new Date(formData.startDate);
				const due = new Date(formData.dueDate);
				if (start > due) {
					newErrors.startDate = "Start date cannot be after due date";
					newErrors.dueDate = "Due date cannot be before start date";
				}
			}

			if (formData.projectId && formData.dueDate) {
				const project = projects.find((p) => p.id === formData.projectId);
				if (project?.dueDate) {
					const due = new Date(formData.dueDate);
					const projectDue = new Date(project.dueDate);
					if (due > projectDue) {
						const formattedProjDue = project.dueDate.split("T")[0];
						newErrors.dueDate = `Task due date must not cross the project target date (${formattedProjDue})`;
					}
				}
			}

			if (formData.assigneeId && formData.projectId) {
				const project = projects.find((p) => p.id === formData.projectId);
				if (project) {
					const isMember =
						project.ownerId === formData.assigneeId ||
						(Array.isArray(project.members) &&
							project.members.includes(formData.assigneeId));
					if (!isMember) {
						newErrors.assigneeId =
							"Add the member to the project and then assign task";
					}
				}
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleBlurField = (field: string, value: any) => {
		setErrors((prev) => {
			const next = { ...prev };
			if (field === "projectId") {
				if (!value) next.projectId = "Project is required";
				else delete next.projectId;
			}
			if (field === "title") {
				if (!value?.trim()) next.title = "Title is required";
				else if (value.trim().length < 3)
					next.title = "Title must be at least 3 characters";
				else delete next.title;
			}
			if (field === "description") {
				if (!value?.trim()) next.description = "Description is required";
				else if (value.trim().length < 10)
					next.description = "Description must be at least 10 characters";
				else delete next.description;
			}
			if (field === "priority") {
				if (!value) next.priority = "Priority is required";
				else delete next.priority;
			}
			if (field === "status") {
				if (!value) next.status = "Status is required";
				else delete next.status;
			}
			if (field === "startDate") {
				if (!value) next.startDate = "Start date is required";
				else delete next.startDate;
			}
			if (field === "dueDate") {
				if (!value) next.dueDate = "Due date is required";
				else delete next.dueDate;
			}
			if (field === "assigneeId") {
				if (value && formData.projectId) {
					const project = projects.find((p) => p.id === formData.projectId);
					if (project) {
						const isMember =
							project.ownerId === value ||
							(Array.isArray(project.members) &&
								project.members.includes(value));
						if (!isMember) {
							next.assigneeId =
								"Add the member to the project and then assign task";
						} else {
							delete next.assigneeId;
						}
					}
				} else {
					delete next.assigneeId;
				}
			}
			if (formData.startDate && formData.dueDate) {
				const start = new Date(
					field === "startDate" ? value : formData.startDate,
				);
				const due = new Date(field === "dueDate" ? value : formData.dueDate);
				if (start > due) {
					next.startDate = "Start date cannot be after due date";
					next.dueDate = "Due date cannot be before start date";
				} else {
					if (next.startDate === "Start date cannot be after due date")
						delete next.startDate;
					if (next.dueDate === "Due date cannot be before start date")
						delete next.dueDate;
				}
			}

			if (formData.projectId) {
				const project = projects.find((p) => p.id === formData.projectId);
				const effectiveDueDate = field === "dueDate" ? value : formData.dueDate;
				if (project?.dueDate && effectiveDueDate) {
					const due = new Date(effectiveDueDate);
					const projectDue = new Date(project.dueDate);
					if (due > projectDue) {
						const formattedProjDue = project.dueDate.split("T")[0];
						next.dueDate = `Task due date must not cross the project target date (${formattedProjDue})`;
					} else if (
						next.dueDate &&
						next.dueDate.startsWith("Task due date must not cross")
					) {
						delete next.dueDate;
					}
				}
			}
			return next;
		});
	};

	const nextStep = () => {
		if (validateStep(step)) {
			setStep((s) => Math.min(s + 1, 4));
		} else {
			toast.error("Please fix the errors before proceeding.");
		}
	};

	const isStep1Valid = !!(
		formData.projectId &&
		formData.title?.trim() &&
		formData.title.trim().length >= 3 &&
		formData.description?.trim() &&
		formData.description.trim().length >= 10 &&
		formData.priority &&
		!errors.projectId &&
		!errors.title &&
		!errors.description &&
		!errors.priority
	);

	const isAssigneeValid =
		!formData.assigneeId ||
		!formData.projectId ||
		(() => {
			const project = projects.find((p) => p.id === formData.projectId);
			if (!project) return true;
			return (
				project.ownerId === formData.assigneeId ||
				(Array.isArray(project.members) &&
					project.members.includes(formData.assigneeId))
			);
		})();

	const targetProject = projects.find((p) => p.id === formData.projectId);
	const isBeforeProjectDueDate =
		!targetProject?.dueDate ||
		!formData.dueDate ||
		new Date(formData.dueDate) <= new Date(targetProject.dueDate);

	const isStep2Valid = !!(
		formData.status &&
		formData.startDate &&
		formData.dueDate &&
		(!formData.startDate ||
			!formData.dueDate ||
			new Date(formData.startDate) <= new Date(formData.dueDate)) &&
		isBeforeProjectDueDate &&
		!errors.status &&
		!errors.startDate &&
		!errors.dueDate &&
		!errors.assigneeId &&
		isAssigneeValid
	);

	const isContinueDisabled = () => {
		if (step === 1) return !isStep1Valid;
		if (step === 2) return !isStep2Valid;
		return false;
	};

	const prevStep = () => setStep((s) => Math.max(s - 1, 1));

	const handleClose = () => {
		setStep(1);
		setErrors({});
		setFormData(initialFormData);
		onClose();
	};

	const handleSubmit = async () => {
		if (!validateStep(4) || !isAssigneeValid) {
			if (!isAssigneeValid) {
				toast.error("Add the member to the project and then assign task");
				setErrors((prev) => ({
					...prev,
					assigneeId: "Add the member to the project and then assign task",
				}));
			} else {
				toast.error("Validation failed");
			}
			return;
		}

		setIsSubmitting(true);
		try {
			const submitData = { ...formData, isDraft: false };
			if (taskToEdit) {
				if (submitData.status && submitData.status !== taskToEdit.status) {
					const project = projects.find((p) => p.id === formData.projectId);
					const defaultCols = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
					const colIds = project?.columns?.length
						? project.columns.map((c) => c.id)
						: defaultCols;
					const workflow = ["BACKLOG", ...colIds.filter((c) => c !== "BACKLOG")];

					const curIdx = workflow.indexOf(taskToEdit.status);
					const newIdx = workflow.indexOf(submitData.status);

					if (curIdx !== -1 && newIdx !== -1 && Math.abs(newIdx - curIdx) > 1) {
						toast.error(
							`Tasks must move step by step through workflow stages (cannot skip directly from "${taskToEdit.status}" to "${submitData.status}").`
						);
						setIsSubmitting(false);
						return;
					}
				}
				await updateTask.mutateAsync({
					id: taskToEdit.id,
					...submitData,
				} as any);
				toast.success("Task updated successfully");
			} else {
				await createTask.mutateAsync(submitData as any);
				toast.success("Task created successfully");
				if (router.pathname !== "/projects/[id]") {
					router.push(`/projects/${formData.projectId}`);
				}
			}
			handleClose();
		} catch (err: any) {
			toast.error(
				err.response?.data?.message || err.message || "Failed to save task",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Portal>
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#33475B]/20 backdrop-blur-sm overflow-y-auto">
			<div className="bg-white dark:bg-[#131B2E] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-[#E0E3E8] dark:border-[#222F49] w-full max-w-3xl flex flex-col my-8 h-[700px] max-h-[90vh]">
				{/* Header */}
				<div className="flex justify-between items-center px-6 py-4 border-b border-[#E0E3E8] dark:border-[#222F49] bg-white dark:bg-[#131B2E] rounded-t-[6px] shrink-0">
					<div>
						<h2 className="text-lg font-semibold text-[#33475B] dark:text-slate-100">
							{taskToEdit ? "Edit Task" : "Create Task"}
						</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
							Step {step} of 4: {STEPS[step - 1]}
						</p>
					</div>
					<button
						onClick={handleClose}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
					>
						<X className="w-6 h-6" />
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
				<div className="p-6 overflow-y-auto flex-1 mt-0">
					{step === 1 && (
						<Step1BasicInfo
							formData={formData}
							setFormData={setFormData}
							errors={errors}
							isFixedProject={!!initialProjectId}
							onBlurField={handleBlurField}
						/>
					)}
					{step === 2 && (
						<Step2Assignment
							formData={formData}
							setFormData={setFormData}
							errors={errors}
							onBlurField={handleBlurField}
							taskToEdit={taskToEdit}
						/>
					)}
					{step === 3 && (
						<Step3Details
							formData={formData}
							setFormData={setFormData}
							errors={errors}
						/>
					)}
					{step === 4 && <Step4Review formData={formData} />}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-[#E0E3E8] dark:border-[#222F49] bg-[#F8FAFC] dark:bg-[#0E1526] rounded-b-md flex items-center justify-end shrink-0">
					<div className="flex items-center gap-3">
						{step > 1 && (
							<Button
								variant="secondary"
								onClick={prevStep}
								disabled={isSubmitting}
								leftIcon={<ChevronLeft className="w-4 h-4" />}
							>
								Back
							</Button>
						)}
						{step < 4 ? (
							<Button
								variant="primary"
								onClick={nextStep}
								rightIcon={<ChevronRight className="w-4 h-4" />}
								disabled={isContinueDisabled()}
							>
								Continue
							</Button>
						) : (
							<Button
								variant="primary"
								onClick={handleSubmit}
								disabled={isSubmitting || !isStep1Valid || !isStep2Valid}
							>
								{isSubmitting && (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								)}
								{taskToEdit ? "Update Task" : "Create Task"}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
		</Portal>
	);
}
