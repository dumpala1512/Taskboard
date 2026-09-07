import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, X } from "lucide-react";
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
	department: z.string().optional(),
	jobTitle: z.string().optional(),
	phone: z.string().optional(),
	joiningDate: z.string().optional(),
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
	const [tempPassword, setTempPassword] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		watch,
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

	const hasRequiredFields =
		!!fullName?.trim() && !!email?.trim();
	const hasErrors = !!(errors.fullName || errors.email);
	const isSubmitDisabled = !hasRequiredFields || hasErrors || loading;

	if (!isOpen) return null;

	const handleClose = () => {
		reset();
		setTempPassword(null);
		setCopied(false);
		onClose();
	};

	const copyToClipboard = () => {
		if (tempPassword) {
			navigator.clipboard.writeText(tempPassword);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success("Password copied to clipboard");
		}
	};

	const onSubmit = async (data: UserFormValues) => {
		setLoading(true);
		try {
			const res = await apiClient.post("/admin/users/create", {
				...data,
				role: "MEMBER",
			});
			setTempPassword(res.data.temporaryPassword);
			onSuccess();
			toast.success("User created successfully");
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Failed to create user");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl shadow-xl max-w-md w-full min-h-[530px] flex flex-col overflow-hidden border border-gray-100 relative scale-in-center">
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
					<h2 className="text-xl font-bold text-gray-900">
						{tempPassword ? "User Created" : "Create New User"}
					</h2>
					<button
						onClick={handleClose}
						className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
					{tempPassword ? (
						<div className="text-center flex-1 flex flex-col justify-between py-2">
							<div>
								<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
									<Check className="w-8 h-8" />
								</div>
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									Account Provisioned
								</h3>
								<p className="text-sm text-gray-500 mb-6">
									The user account has been created. Please securely share these
									temporary credentials with the user. They will be required to
									set a new password on their first login.
								</p>

								<div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
									<div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 text-left">
										Temporary Password
									</div>
									<div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-3">
										<code className="text-sm font-mono text-slate-900 font-bold">
											{tempPassword}
										</code>
										<button
											onClick={copyToClipboard}
											className="text-indigo-600 hover:text-indigo-700 p-1.5 hover:bg-indigo-50 rounded-md transition-colors"
											title="Copy to clipboard"
										>
											{copied ? (
												<Check className="w-4 h-4 text-green-600" />
											) : (
												<Copy className="w-4 h-4" />
											)}
										</button>
									</div>
								</div>
							</div>

							<Button
								variant="primary"
								onClick={handleClose}
								className="w-full"
							>
								Done
							</Button>
						</div>
					) : (
						<form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between">
							<div className="space-y-2">
								<Input
									label="Full Name *"
									placeholder="e.g. Jane Doe"
									error={errors.fullName?.message}
									reserveErrorSpace
									{...register("fullName")}
								/>

								<Input
									label="Email Address *"
									type="email"
									error={errors.email?.message}
									reserveErrorSpace
									{...register("email")}
								/>

								<div className="grid grid-cols-2 gap-4">
									<Input
										label="Department (Optional)"
										{...register("department")}
									/>
									<Input label="Job Title (Optional)" {...register("jobTitle")} />
								</div>

								<div>
									<Input
										label="Joining Date (Optional)"
										type="date"
										{...register("joiningDate")}
									/>
								</div>
							</div>

							<div className="pt-4 flex justify-end shrink-0">
								<Button
									type="submit"
									variant="primary"
									isLoading={loading}
									disabled={isSubmitDisabled}
								>
									Create User
								</Button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
