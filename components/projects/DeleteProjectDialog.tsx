import { Trash2 } from "lucide-react";
import React, { useState } from "react";
import type { Project } from "../../server/types";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface DeleteProjectDialogProps {
	project: Project | null;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (id: string) => Promise<void>;
}

export function DeleteProjectDialog({
	project,
	isOpen,
	onClose,
	onConfirm,
}: DeleteProjectDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirm = async () => {
		if (!project) return;
		setIsDeleting(true);
		try {
			await onConfirm(project.id);
			onClose();
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<ConfirmDialog
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleConfirm}
			isProcessing={isDeleting}
			title="Delete Project"
			icon={<Trash2 className="w-6 h-6" />}
			iconClassName="bg-red-100 text-red-600"
			confirmText="Delete Project"
			confirmButtonClassName="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white border-transparent"
			requireCheckbox={true}
			description={
				<div className="space-y-4">
					<p>
						Are you sure you want to permanently delete <br />
						<strong className="text-gray-900 font-semibold">
							"{project?.name}"
						</strong>
						?
					</p>

					<div>
						<p className="mb-2 text-gray-700">This will permanently remove:</p>
						<ul className="list-disc pl-5 space-y-1 text-gray-600">
							<li>All tasks</li>
							<li>Activities & comments</li>
							<li>Files & attachments</li>
							<li>Reports and project data</li>
						</ul>
					</div>

					<p className="text-red-600 font-medium pt-2">
						This action cannot be undone.
					</p>
				</div>
			}
		/>
	);
}
