import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertCircle,
	Check,
	Eye,
	EyeOff,
	KeyRound,
	Lock,
	ShieldCheck,
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { apiClient } from "../../lib/axios";

const setupSchema = z
	.object({
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
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type SetupFormValues = z.infer<typeof setupSchema>;

export default function AccountSetup() {
	const router = useRouter();
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);

	const token =
		typeof router.query.token === "string" ? router.query.token : undefined;
	const email =
		typeof router.query.email === "string" ? router.query.email : undefined;

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
		{
			label: "At least one uppercase letter",
			met: /[A-Z]/.test(newPasswordValue),
		},
		{
			label: "At least one lowercase letter",
			met: /[a-z]/.test(newPasswordValue),
		},
		{ label: "At least one number", met: /[0-9]/.test(newPasswordValue) },
		{
			label: "At least one special character",
			met: /[^A-Za-z0-9]/.test(newPasswordValue),
		},
	];

	const onSubmit = async (data: SetupFormValues) => {
		if (!token) {
			setGlobalError(
				"Invitation token is missing. Please open the link directly from your invitation email.",
			);
			return;
		}

		setLoading(true);
		setGlobalError(null);

		try {
			// Call real FastAPI endpoint to activate account and set password
			await apiClient.post("/auth/setup-password", {
				token: token,
				newPassword: data.newPassword,
			});

			toast.success(
				"Account activated successfully! Please sign in with your new password.",
				{ duration: 4000 },
			);

			// Redirect to sign in page
			setTimeout(() => {
				window.location.href = "/auth/signin";
			}, 500);
		} catch (err: unknown) {
			const error = err as {
				response?: { data?: { detail?: string; message?: string } };
			};
			const errorMsg =
				error.response?.data?.detail ||
				error.response?.data?.message ||
				"Failed to activate account. The invitation link may have expired or has already been used.";
			setGlobalError(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	// When router is ready and there is no token in URL
	if (router.isReady && !token) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
				<Head>
					<title>Invalid Invitation | Taskboard</title>
				</Head>
				<div className="max-w-[460px] w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
					<div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
						<AlertCircle className="w-7 h-7" />
					</div>
					<h1 className="text-xl font-bold text-slate-900 mb-2">
						Invalid or Missing Invitation Link
					</h1>
					<p className="text-sm text-slate-600 leading-relaxed mb-6">
						This page requires a secure activation token. If you were invited to
						join Taskboard, please open the full link sent to your email
						address.
					</p>
					<Button
						variant="primary"
						onClick={() => router.push("/auth/signin")}
						className="w-full"
					>
						Go to Sign In
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<Head>
				<title>Set Up Password | Taskboard</title>
			</Head>

			<div className="max-w-[480px] w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl mx-auto mb-4 flex items-center justify-center text-indigo-600">
						<KeyRound className="w-6 h-6" />
					</div>
					<h1 className="text-2xl font-bold text-slate-900 mb-2">
						Set Up Your Password
					</h1>
					<p className="text-sm text-slate-600 leading-relaxed">
						{email ? (
							<>
								Welcome! Create a secure password for{" "}
								<span className="font-semibold text-slate-900">{email}</span> to
								activate your workspace account.
							</>
						) : (
							"Welcome! Create a secure password to activate your workspace account."
						)}
					</p>
				</div>

				{globalError && (
					<div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2.5">
						<AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
						<div className="leading-relaxed">{globalError}</div>
					</div>
				)}

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
					{/* New Password */}
					<div className="relative">
						<Input
							label="New Password"
							type={showNewPassword ? "text" : "password"}
							placeholder="Enter a secure password"
							leftIcon={<Lock className="h-5 w-5" />}
							error={errors.newPassword?.message}
							required
							{...register("newPassword")}
							className="[&::-ms-reveal]:hidden"
						/>
						<button
							type="button"
							className={`absolute right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none ${
								errors.newPassword ? "top-8" : "inset-y-0 mt-6"
							}`}
							onClick={() => setShowNewPassword(!showNewPassword)}
							aria-label={showNewPassword ? "Hide password" : "Show password"}
						>
							{showNewPassword ? (
								<Eye className="h-5 w-5" />
							) : (
								<EyeOff className="h-5 w-5" />
							)}
						</button>
					</div>

					{/* Confirm Password */}
					<div className="relative">
						<Input
							label="Confirm Password"
							type={showConfirmPassword ? "text" : "password"}
							placeholder="Re-enter your password"
							leftIcon={<ShieldCheck className="h-5 w-5" />}
							error={errors.confirmPassword?.message}
							required
							{...register("confirmPassword")}
							className="[&::-ms-reveal]:hidden"
						/>
						<button
							type="button"
							className={`absolute right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none ${
								errors.confirmPassword ? "top-8" : "inset-y-0 mt-6"
							}`}
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							aria-label={
								showConfirmPassword ? "Hide password" : "Show password"
							}
						>
							{showConfirmPassword ? (
								<Eye className="h-5 w-5" />
							) : (
								<EyeOff className="h-5 w-5" />
							)}
						</button>
					</div>

					{/* Password Requirements Checklist */}
					<div className="pt-1">
						<div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
							<h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
								Password Requirements
							</h4>
							<ul className="text-xs space-y-1.5 mt-2">
								{reqs.map((req) => (
									<li
										key={req.label}
										className={`flex items-center gap-2 transition-colors ${
											req.met
												? "text-emerald-700 font-medium"
												: "text-slate-600"
										}`}
									>
										{req.met ? (
											<Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
										) : (
											<span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
										)}
										<span>{req.label}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Submit Button */}
					<Button
						type="submit"
						variant="primary"
						className="w-full mt-4"
						isLoading={loading || isSubmitting}
					>
						Activate Account & Sign In
					</Button>
				</form>

				<div className="mt-6 text-center">
					<Link
						href="/auth/signin"
						className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
					>
						Already have an account? Sign In
					</Link>
				</div>
			</div>
		</div>
	);
}
