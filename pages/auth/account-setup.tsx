import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertCircle,
	Check,
	Eye,
	EyeOff,
	Loader2,
	Lock,
	ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/axios";

const setupSchema = z
	.object({
		currentPassword: z
			.string()
			.min(1, "Current temporary password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(128, "Password must be less than 128 characters")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/[a-z]/, "Password must contain at least one lowercase letter")
			.regex(/[0-9]/, "Password must contain at least one number")
			.regex(
				/[^A-Za-z0-9]/,
				"Password must contain at least one special character",
			),
		confirmPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function AccountSetup() {
	const router = useRouter();
	const { data: session, update } = useSession();
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<SetupFormValues>({
		resolver: zodResolver(setupSchema),
		mode: "onChange",
	});

	const newPasswordValue = watch("newPassword") || "";
	
	const reqs = [
		{ label: "Minimum 8 characters", met: newPasswordValue.length >= 8 },
		{ label: "At least one uppercase letter", met: /[A-Z]/.test(newPasswordValue) },
		{ label: "At least one lowercase letter", met: /[a-z]/.test(newPasswordValue) },
		{ label: "At least one number", met: /[0-9]/.test(newPasswordValue) },
		{ label: "At least one special character", met: /[^A-Za-z0-9]/.test(newPasswordValue) },
	];

	const onSubmit = async (data: SetupFormValues) => {
		setLoading(true);
		setGlobalError(null);

		try {
			const userEmail = session?.user?.email;
			const userId = (session?.user as any)?.id;

			const res = await apiClient.post("/auth/setup-account", {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
				email: userEmail,
				userId: userId,
			});

			await update({ isFirstLogin: false });
			
			toast.success(
				"Account setup complete! Welcome to the platform.",
			);

			const role = (session?.user as any)?.role;
			const targetUrl = role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

			// Full page navigation ensures fresh session cookies are evaluated by middleware
			window.location.href = targetUrl;
		} catch (error: any) {
			setGlobalError(
				error.response?.data?.message || "Failed to setup account",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="max-w-[480px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="text-center mb-8">
					<div className="w-12 h-12 bg-indigo-100 rounded-lg mx-auto mb-4 flex items-center justify-center text-indigo-600">
						<ShieldCheck className="w-6 h-6" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Complete Account Setup
					</h1>
					<p className="text-sm text-gray-500 leading-relaxed">
						Welcome, {session?.user?.name}! For security reasons, you must
						change your temporary password before accessing the platform.
					</p>
				</div>

				{globalError && (
					<div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						{globalError}
					</div>
				)}

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
					<div className="relative">
						<Input
							label="Current Temporary Password"
							type={showCurrentPassword ? "text" : "password"}
							placeholder="••••••••"
							leftIcon={<Lock className="h-5 w-5" />}
							error={errors.currentPassword?.message}
							required
							{...register("currentPassword")}
							className="[&::-ms-reveal]:hidden"
						/>
						<button
							type="button"
							className={`absolute right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none ${errors.currentPassword ? "top-8" : "inset-y-0 mt-6"}`}
							onClick={() => setShowCurrentPassword(!showCurrentPassword)}
						>
							{showCurrentPassword ? (
								<Eye className="h-5 w-5" />
							) : (
								<EyeOff className="h-5 w-5" />
							)}
						</button>
					</div>

					<div className="relative">
						<Input
							label="New Password"
							type={showNewPassword ? "text" : "password"}
							placeholder="••••••••"
							leftIcon={<ShieldCheck className="h-5 w-5" />}
							error={errors.newPassword?.message}
							required
							{...register("newPassword")}
							className="[&::-ms-reveal]:hidden"
						/>
						<button
							type="button"
							className={`absolute right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none ${errors.newPassword ? "top-8" : "inset-y-0 mt-6"}`}
							onClick={() => setShowNewPassword(!showNewPassword)}
						>
							{showNewPassword ? (
								<Eye className="h-5 w-5" />
							) : (
								<EyeOff className="h-5 w-5" />
							)}
						</button>
					</div>

					<div className="relative">
						<Input
							label="Confirm New Password"
							type={showConfirmPassword ? "text" : "password"}
							placeholder="••••••••"
							leftIcon={<ShieldCheck className="h-5 w-5" />}
							error={errors.confirmPassword?.message}
							required
							{...register("confirmPassword")}
							className="[&::-ms-reveal]:hidden"
						/>
						<button
							type="button"
							className={`absolute right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none ${errors.confirmPassword ? "top-8" : "inset-y-0 mt-6"}`}
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
						>
							{showConfirmPassword ? (
								<Eye className="h-5 w-5" />
							) : (
								<EyeOff className="h-5 w-5" />
							)}
						</button>
					</div>

					<div className="pt-2">
						<div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
							<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
								Password Requirements
							</h4>
							<ul className="text-xs space-y-1.5 mt-2">
								{reqs.map((req, idx) => (
									<li key={idx} className={`flex items-center gap-2 transition-colors ${req.met ? 'text-green-600 font-medium' : 'text-slate-600'}`}>
										{req.met ? (
											<Check className="w-3.5 h-3.5 shrink-0" />
										) : (
											<span className="w-1.5 h-1.5 rounded-full bg-slate-400 ml-1 mr-1 shrink-0" />
										)}
										<span>{req.label}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					<Button
						type="submit"
						className="w-full mt-4"
						isLoading={loading || isSubmitting}
					>
						Update Password & Continue
					</Button>
				</form>
			</div>
		</div>
	);
}
