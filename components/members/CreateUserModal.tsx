import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock, MailCheck, Send, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { apiClient } from "../../lib/axios";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const userSchema = z.object({
	fullName: z
		.string()
		.min(1, "Full name is required")
		.max(50, "Full name must be less than 50 characters")
		.regex(/^[A-Za-z\s]+$/, "Full name can only contain letters and spaces"),
	email: z
		.string()
		.min(1, "Email is required")
		.email("Invalid email address")
		.max(100, "Email must be less than 100 characters"),
	role: z.enum(["ADMIN", "MEMBER"]),
});

type UserFormValues = z.infer<typeof userSchema>;

interface CreateUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function CreateUserModal({
	isOpen,
	onClose,
	onSuccess,
}: CreateUserModalProps) {
	const [loading, setLoading] = useState(false);
	const [invitedUser, setInvitedUser] = useState<{
		name: string;
		email: string;
		role: string;
	} | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors },
	} = useForm<UserFormValues>({
		resolver: zodResolver(userSchema),
		mode: "onBlur",
		defaultValues: {
			role: "MEMBER",
			fullName: "",
			email: "",
		},
	});

	const fullName = watch("fullName");
	const email = watch("email");

	const hasRequiredFields = !!fullName?.trim() && !!email?.trim();
	const hasErrors = !!(errors.fullName || errors.email);
	const isSubmitDisabled = !hasRequiredFields || hasErrors || loading;

	if (!isOpen) return null;

	const handleClose = () => {
		reset();
		setInvitedUser(null);
		onClose();
	};

	const handleInviteAnother = () => {
		reset();
		setInvitedUser(null);
	};

	const onSubmit = async (data: UserFormValues) => {
		setLoading(true);
		try {
			await apiClient.post("/admin/users", {
				full_name: data.fullName.trim(),
				email: data.email.trim().toLowerCase(),
				role: data.role || "MEMBER",
			});

			setInvitedUser({
				name: data.fullName.trim(),
				email: data.email.trim().toLowerCase(),
				role: data.role || "MEMBER",
			});

			onSuccess();
			toast.success("Invitation email dispatched successfully!");
		} catch (err: unknown) {
			const error = err as {
				response?: { data?: { detail?: string; message?: string } };
			};
			const errorMsg =
				error.response?.data?.detail ||
				error.response?.data?.message ||
				"Failed to send invitation. Please try again.";
			toast.error(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl shadow-xl max-w-lg w-full flex flex-col overflow-hidden border border-gray-100 relative scale-in-center">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
					<div>
						<h2 className="text-lg font-bold text-gray-900">
							{invitedUser ? "Invitation Sent" : "Invite Team Member"}
						</h2>
						<p className="text-xs text-gray-500 mt-0.5">
							{invitedUser
								? "The invitation email is on its way"
								: "Enter Full Name and Email to send an activation invite"}
						</p>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
						aria-label="Close modal"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 overflow-y-auto max-h-[80vh]">
					{invitedUser ? (
						/* Invitation Sent Confirmation Screen */
						<div className="text-center py-2 space-y-6">
							<div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
								<MailCheck className="w-8 h-8" />
							</div>

							<div>
								<h3 className="text-xl font-bold text-gray-900 mb-1">
									Invitation Email Dispatched!
								</h3>
								<p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
									An invitation email has been sent to{" "}
									<span className="font-semibold text-gray-900">
										{invitedUser.email}
									</span>
									. They will receive a link to set up their password and
									activate their account.
								</p>
							</div>

							{/* Member Details Card */}
							<div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
										Member Name
									</span>
									<span className="text-sm font-medium text-slate-900">
										{invitedUser.name}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
										Role
									</span>
									<span
										className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
											invitedUser.role === "ADMIN"
												? "bg-purple-100 text-purple-700"
												: "bg-blue-100 text-blue-700"
										}`}
									>
										{invitedUser.role}
									</span>
								</div>
								<div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
									<span className="text-xs text-slate-500 flex items-center gap-1">
										<Clock className="w-3.5 h-3.5 text-slate-400" /> Link
										Validity
									</span>
									<span className="text-xs font-medium text-slate-700">
										Expires in 24 hours
									</span>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex items-center gap-3 pt-2">
								<Button
									type="button"
									variant="secondary"
									onClick={handleInviteAnother}
									className="flex-1"
								>
									Invite Another
								</Button>
								<Button
									type="button"
									variant="primary"
									onClick={handleClose}
									className="flex-1"
								>
									Done
								</Button>
							</div>
						</div>
					) : (
						/* Invitation Form - Full Name, Email, and Member Role */
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<Input
								label="Full Name *"
								placeholder="e.g. Jane Doe"
								error={errors.fullName?.message}
								{...register("fullName")}
							/>

							<Input
								label="Email Address *"
								type="email"
								placeholder="e.g. jane.doe@company.com"
								error={errors.email?.message}
								{...register("email")}
							/>

							{/* Role Section - Member Only */}
							<div>
								<div className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
									Role *
								</div>
								<div className="p-3.5 rounded-xl border border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-500/60 ring-1 ring-blue-500/30 flex items-center justify-between transition-all">
									<div>
										<div className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
											<span>Member</span>
											<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
												Standard
											</span>
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											Can view &amp; work on assigned projects and tasks
										</div>
									</div>
									<CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-3" />
								</div>
							</div>

							<div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
								<Button
									type="button"
									variant="secondary"
									onClick={handleClose}
									disabled={loading}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									leftIcon={<Send className="w-4 h-4" />}
									isLoading={loading}
									disabled={isSubmitDisabled}
								>
									Send Invitation
								</Button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
