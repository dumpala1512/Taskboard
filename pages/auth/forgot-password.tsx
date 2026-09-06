import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
	type ForgotPasswordValues,
	forgotPasswordSchema,
} from "../../schemas/auth.schema";

export default function ForgotPassword() {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<ForgotPasswordValues>({
		resolver: zodResolver(forgotPasswordSchema),
		mode: "onBlur",
	});

	const onSubmit = async (data: ForgotPasswordValues) => {
		setLoading(true);
		setGlobalError(null);

		try {
			await axios.post("/api/auth/forgot-password", data);
			setSuccess(true);
		} catch (error: any) {
			setGlobalError(
				error.response?.data?.message ||
					"Something went wrong. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="max-w-[400px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="text-center mb-8">
					<div className="w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-4 flex items-center justify-center text-indigo-600">
						<Mail className="w-6 h-6" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Forgot password?
					</h1>
					<p className="text-sm text-gray-500">
						No worries, we'll send you reset instructions.
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
								<p className="text-sm text-emerald-800 font-medium text-center">
									If an account exists with this email address, a password reset
									link has been sent.
								</p>
							</div>
						</div>
						<Link href="/auth/signin" className="block">
							<Button
								className="w-full"
								leftIcon={<ArrowLeft className="w-4 h-4" />}
							>
								Back to log in
							</Button>
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
						<Input
							label="Email"
							type="email"
							placeholder="you@company.com"
							leftIcon={<Mail className="h-5 w-5" />}
							error={errors.email?.message}
							required
							{...register("email")}
						/>

						<Button
							type="submit"
							className="w-full mt-4"
							isLoading={loading || isSubmitting}
						>
							Reset Password
						</Button>

						<div className="mt-6 text-center">
							<Link
								href="/auth/signin"
								className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
							>
								<ArrowLeft className="w-4 h-4 mr-2" />
								Back to log in
							</Link>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
