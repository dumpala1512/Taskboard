import { Archive } from "lucide-react";
import React from "react";
import type { Project } from "../../server/types";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface ArchiveProjectDialogProps {
	project: Project | null;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (id: string) => Promise<void>;
}

export function ArchiveProjectDialog({
	project,
	isOpen,
	onClose,
	onConfirm,
}: ArchiveProjectDialogProps) {
	const [isArchiving, setIsArchiving] = React.useState(false);

	const handleConfirm = async () => {
		if (!project) return;
		setIsArchiving(true);
		try {
			await onConfirm(project.id);
			onClose();
		} finally {
			setIsArchiving(false);
		}
	};

	return (
		<ConfirmDialog
			isOpen={isOpen}
			onClose={onClose}
			onConfirm={handleConfirm}
			isProcessing={isArchiving}
			title="Archive Project"
			icon={<Archive className="w-6 h-6" />}
			iconClassName="bg-amber-100 text-amber-600"
			confirmText="Archive Project"
			confirmButtonClassName="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white border-transparent"
			description={
				<>
					<p>
						Are you sure you want to archive{" "}
						<strong className="text-gray-900">{project?.name}</strong>?
					</p>
					<p className="mt-2 text-sm text-gray-500">
						Archived projects are hidden from active views but their data is
						preserved and can be restored later.
					</p>
				</>
			}
		/>
	);
}
