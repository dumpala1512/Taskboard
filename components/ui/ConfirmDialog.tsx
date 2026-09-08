import React from "react";
import { Portal } from "./Portal";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	description: React.ReactNode;
	confirmText?: string;
	cancelText?: string;
	icon?: React.ReactNode;
	iconClassName?: string;
	confirmButtonVariant?: "primary" | "outline" | "ghost";
	confirmButtonClassName?: string;
	requireCheckbox?: boolean;
	checkboxLabel?: string;
	isProcessing?: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
	isOpen,
	title,
	description,
	confirmText = "Confirm",
	cancelText = "Cancel",
	icon = <AlertTriangle className="w-6 h-6" />,
	iconClassName = "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400",
	confirmButtonVariant = "primary",
	confirmButtonClassName = "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white border-transparent",
	requireCheckbox = false,
	checkboxLabel = "I understand this action is irreversible",
	isProcessing = false,
	onClose,
	onConfirm
}: ConfirmDialogProps) {
	const [isConfirmed, setIsConfirmed] = React.useState(false);

	React.useEffect(() => {
		if (!isOpen) {
			setIsConfirmed(false);
		}
	}, [isOpen]);

	if (!isOpen) {
		return null;
	}

	const handleClose = () => {
		setIsConfirmed(false);
		onClose();
	};

	const canConfirm = requireCheckbox ? isConfirmed : true;

	return (
		<Portal>
			<div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
				<div className="bg-white dark:bg-[#131B2E] rounded-xl shadow-2xl max-w-[480px] w-full overflow-hidden border border-slate-200 dark:border-[#222F49] relative">
					<button
						onClick={handleClose}
						className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#1A233A] focus:outline-none"
						disabled={isProcessing}
					>
						<X className="w-5 h-5" />
					</button>
					
					<div className="p-6 pb-4 flex flex-col items-center text-center">
						<div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${iconClassName}`}>
							{icon}
						</div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{title}</h3>
						
						<div className="text-left w-full space-y-3 text-sm text-gray-600 dark:text-slate-300">
							{typeof description === 'string' ? <p>{description}</p> : description}
							
							{requireCheckbox && (
								<div className="pt-4 pb-2">
									<label className="flex items-start gap-3 cursor-pointer group">
										<div className="flex items-center h-5 mt-0.5">
											<input
												type="checkbox"
												checked={isConfirmed}
												onChange={(e) => setIsConfirmed(e.target.checked)}
												className="w-4 h-4 border-[#E0E3E8] dark:border-[#222F49] rounded text-[#1E88E5] focus:ring-[#1E88E5] dark:bg-[#1A233A]"
											/>
										</div>
										<span className="text-sm text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors">
											{checkboxLabel}
										</span>
									</label>
								</div>
							)}
						</div>
					</div>

					<div className="px-6 py-4 bg-slate-50 dark:bg-[#0E1526] border-t border-slate-200 dark:border-[#222F49] flex justify-end gap-3">
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={isProcessing}
							className="px-4 shadow-sm bg-white dark:bg-[#1A233A] hover:bg-slate-100 dark:hover:bg-[#222F49] border-slate-200 dark:border-[#222F49] text-slate-700 dark:text-slate-200"
						>
							{cancelText}
						</Button>
						<Button
							variant={confirmButtonVariant}
							onClick={onConfirm}
							disabled={isProcessing || !canConfirm}
							className={`px-4 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClassName}`}
							leftIcon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
						>
							{isProcessing ? "Processing..." : confirmText}
						</Button>
					</div>
				</div>
			</div>
		</Portal>
	);
}
