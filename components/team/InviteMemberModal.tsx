import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { toast } from "react-hot-toast";

interface InviteMemberModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("MEMBER");
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleInvite = async () => {
		if (!email) {
			toast.error("Please enter an email address");
			return;
		}

		setIsSubmitting(true);
		
		// Simulate API call for sending invite
		setTimeout(() => {
			toast.success(`Invite sent to ${email}`);
			setIsSubmitting(false);
			setEmail("");
			onClose();
		}, 800);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
			<div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
				<div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
					<h2 className="text-xl font-semibold text-slate-900 dark:text-white">Invite Member</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				<div className="p-6 space-y-4">
					<div className="space-y-1">
						<label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address *</label>
						<Input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="colleague@company.com"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
						<select
							value={role}
							onChange={(e) => setRole(e.target.value)}
							className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
						>
							<option value="MEMBER">Member (Can view and edit assigned items)</option>
							<option value="ADMIN">Admin (Full access)</option>
						</select>
					</div>
				</div>

				<div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
					<Button onClick={handleInvite} disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
						Send Invite
					</Button>
				</div>
			</div>
		</div>
	);
}
