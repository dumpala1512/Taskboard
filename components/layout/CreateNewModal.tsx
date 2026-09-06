import { Check, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useProjects } from "../../hooks/useProjects";
import { Portal } from "../ui/Portal";

interface CreateNewModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreate: (type: string) => void;
}

export function CreateNewModal({
	isOpen,
	onClose,
	onCreate,
}: CreateNewModalProps) {
	const [selectedType, setSelectedType] = useState<string>("");
	const { data: projects = [] } = useProjects();
	const hasProjects = projects.length > 0;

	useEffect(() => {
		if (isOpen) {
			setSelectedType("");
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const options = [
		{ id: "project", label: "Project", disabled: false, tooltip: "" },
		{
			id: "task",
			label: "Task",
			disabled: !hasProjects,
			tooltip: !hasProjects ? "You need to create a project first" : "",
		},
	];

	return (
		<Portal>
			<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20">
				<div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
					<div className="flex justify-between items-center p-4">
						<div className="w-6" /> {/* Spacer for centering title */}
						<h2 className="text-lg font-bold text-gray-900">Create New</h2>
						<button
							onClick={onClose}
							className="text-gray-500 hover:text-gray-700"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<div className="px-4 pb-4 space-y-3">
						{options.map((option) => (
							<label
								key={option.id}
								title={option.tooltip}
								className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg transition-colors ${
									option.disabled
										? "opacity-50 cursor-not-allowed bg-gray-50"
										: "cursor-pointer hover:bg-gray-50"
								}`}
								onClick={() => {
									if (!option.disabled) {
										setSelectedType(option.id);
									}
								}}
							>
								<div
									className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedType === option.id ? "bg-gray-400" : "bg-gray-200"}`}
								>
									{selectedType === option.id && (
										<Check className="w-3.5 h-3.5 text-white" />
									)}
								</div>
								<div className="flex flex-col">
									<span className="text-base text-gray-600 font-medium">
										{option.label}
									</span>
									{option.disabled && (
										<span className="text-xs text-gray-500 mt-0.5">
											{option.tooltip}
										</span>
									)}
								</div>
							</label>
						))}
					</div>

					<div className="p-4 pt-2">
						<button
							disabled={!selectedType}
							onClick={() => {
								if (selectedType) {
									onCreate(selectedType);
									onClose();
								}
							}}
							className={`w-full py-2.5 font-medium rounded-full transition-colors text-sm ${
								selectedType
									? "bg-gray-200 hover:bg-gray-300 text-gray-700"
									: "bg-gray-100 text-gray-400 cursor-not-allowed"
							}`}
						>
							Create
						</button>
					</div>
				</div>
			</div>
		</Portal>
	);
}
