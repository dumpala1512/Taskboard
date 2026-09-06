import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Eye,
	EyeOff,
	Loader2,
	Lock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
	type ResetPasswordValues,
	resetPasswordSchema,
} from "../../schemas/auth.schema";

export default function ResetPassword() {
	const router = useRouter();
	const { token } = router.query;

	const [verifying, setVerifying] = useState(true);
	const [tokenValid, setTokenValid] = useState(false);

	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
	} = useForm<ResetPasswordValues>({
		resolver: zodResolver(resetPasswordSchema),
		mode: "onChange",
	});

	const passwordValue = useWatch({
		control,
		name: "password",
		defaultValue: "",
	});

	useEffect(() => {
		if (!router.isReady) return;

		if (!token) {
			setVerifying(false);
			setTokenValid(false);
			return;
		}

		const verifyToken = async () => {
			try {
				await axios.get(`/api/auth/verify-reset-token?token=${token}`);
				setTokenValid(true);
			} catch (error) {
				setTokenValid(false);
			} finally {
				setVerifying(false);
			}
		};

		verifyToken();
	}, [router.isReady, token]);

	const onSubmit = async (data: ResetPasswordValues) => {
		if (!token) return;

		setLoading(true);
		setGlobalError(null);

		try {
			await axios.post("/api/auth/reset-password", {
				token,
				password: data.password,
			});
			setSuccess(true);
		} catch (error: any) {
			setGlobalError(
				error.response?.data?.message ||
					"Failed to reset password. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	const checkRequirements = (pwd: string) => ({
		length: pwd.length >= 8,
		upper: /[A-Z]/.test(pwd),
		lower: /[a-z]/.test(pwd),
		number: /[0-9]/.test(pwd),
		special: /[^A-Za-z0-9]/.test(pwd),
	});

	const reqs = checkRequirements(passwordValue);

	if (!router.isReady || verifying) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
			</div>
		);
	}

	if (!tokenValid) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="max-w-[400px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
					<div className="w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center text-red-600">
						<AlertCircle className="w-6 h-6" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Invalid or Expired Link
					</h1>
					<p className="text-sm text-gray-500 mb-6">
						This password reset link is invalid or has expired. Please request a
						new one.
					</p>
					<Link href="/auth/forgot-password">
						<Button className="w-full">Request New Link</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="max-w-[400px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="text-center mb-8">
					<div className="w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-4 flex items-center justify-center text-indigo-600">
						<Lock className="w-6 h-6" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Set new password
					</h1>
					<p className="text-sm text-gray-500">
						Your new password must be different from previous used passwords.
					</p>
				</div>

				{globalError && (
					<div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						{globalError}
					</div>
				)}

				{success ? (
					<div className="text-center space-y-6">
						<div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
							<div className="flex flex-col items-center gap-3">
								<CheckCircle2 className="w-8 h-8 text-emerald-600" />
								<h3 className="text-emerald-800 font-semibold">
									Password Reset Successfully
								</h3>
								<p className="text-sm text-emerald-700 text-center">
									Your password has been changed. You can now log in with your
									new password.
								</p>
							</div>
						</div>
						<Link href="/auth/signin" className="block">
							<Button
								className="w-full"
								rightIcon={<ArrowRight className="w-4 h-4" />}
							>
								Continue to log in
							</Button>
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
						<div className="relative">
							<Input
								label="New Password"
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								leftIcon={<Lock className="h-5 w-5" />}
								error={errors.password?.message}
								required
								{...register("password")}
								className="[&::-ms-reveal]:hidden"
							/>
							<button
								type="button"
								className={`absolute right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none ${errors.password ? "top-8" : "inset-y-0 mt-6"}`}
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<Eye className="h-5 w-5" />
								) : (
									<EyeOff className="h-5 w-5" />
								)}
							</button>
						</div>

						{/* Password Requirements Checklist */}
						{passwordValue.length > 0 && (
							<div className="space-y-1 mt-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
								<p className="text-xs font-medium text-gray-700 mb-2">
									Password requirements:
								</p>
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div
										className={`flex items-center gap-1.5 ${reqs.length ? "text-emerald-600" : "text-gray-500"}`}
									>
										<CheckCircle2 className="w-3.5 h-3.5" /> 8+ characters
									</div>
									<div
										className={`flex items-center gap-1.5 ${reqs.upper ? "text-emerald-600" : "text-gray-500"}`}
									>
										<CheckCircle2 className="w-3.5 h-3.5" /> 1 uppercase
									</div>
									<div
										className={`flex items-center gap-1.5 ${reqs.lower ? "text-emerald-600" : "text-gray-500"}`}
									>
										<CheckCircle2 className="w-3.5 h-3.5" /> 1 lowercase
									</div>
									<div
										className={`flex items-center gap-1.5 ${reqs.number ? "text-emerald-600" : "text-gray-500"}`}
									>
										<CheckCircle2 className="w-3.5 h-3.5" /> 1 number
									</div>
									<div
										className={`flex items-center gap-1.5 ${reqs.special ? "text-emerald-600" : "text-gray-500"}`}
									>
										<CheckCircle2 className="w-3.5 h-3.5" /> 1 special char
									</div>
								</div>
							</div>
						)}

						<div className="relative">
							<Input
								label="Confirm Password"
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								leftIcon={<Lock className="h-5 w-5" />}
								error={errors.confirmPassword?.message}
								required
								{...register("confirmPassword")}
								className="[&::-ms-reveal]:hidden"
							/>
						</div>

						<Button
							type="submit"
							className="w-full mt-6"
							isLoading={loading || isSubmitting}
						>
							Reset Password
						</Button>
					</form>
				)}
			</div>
		</div>
	);
}
