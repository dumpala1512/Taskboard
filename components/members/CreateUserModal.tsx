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
	firstName: z
		.string()
		.min(1, "First name is required")
		.max(50, "First name must be less than 50 characters")
		.regex(/^[A-Za-z\s]+$/, "First name can only contain letters and spaces"),
	lastName: z
		.string()
		.min(1, "Last name is required")
		.max(50, "Last name must be less than 50 characters")
		.regex(/^[A-Za-z\s]+$/, "Last name can only contain letters and spaces"),
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
		formState: { errors },
	} = useForm<UserFormValues>({
		resolver: zodResolver(userSchema),
		defaultValues: {
			role: "MEMBER",
		},
	});

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
			const res = await apiClient.post("/admin/users/create", data);
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
			<div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 relative scale-in-center">
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
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

				<div className="p-6">
					{tempPassword ? (
						<div className="text-center">
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

							<Button
								variant="primary"
								onClick={handleClose}
								className="w-full"
							>
								Done
							</Button>
						</div>
					) : (
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<Input
									label="First Name"
									error={errors.firstName?.message}
									{...register("firstName")}
								/>
								<Input
									label="Last Name"
									error={errors.lastName?.message}
									{...register("lastName")}
								/>
							</div>

							<Input
								label="Email Address"
								type="email"
								error={errors.email?.message}
								{...register("email")}
							/>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Role
								</label>
								<select
									{...register("role")}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								>
									<option value="MEMBER">Member</option>
								</select>
							</div>

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

							<div className="pt-4 flex justify-end gap-3">
								<Button type="button" variant="outline" onClick={handleClose}>
									Cancel
								</Button>
								<Button type="submit" variant="primary" isLoading={loading}>
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
