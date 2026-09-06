import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertCircle,
	BarChart3,
	CheckCircle2,
	Eye,
	EyeOff,
	FolderKanban,
	Lock,
	Mail,
	Star,
	Users,
} from "lucide-react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { clientStorage } from "../../lib/client-storage";
import { type SigninFormValues, signinSchema } from "../../schemas/auth.schema";

export default function SignIn() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [globalError, setGlobalError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SigninFormValues>({
		resolver: zodResolver(signinSchema),
		mode: "onBlur", // Validates on blur per the standards
	});

	const onSubmit = async (data: SigninFormValues) => {
		setLoading(true);
		setGlobalError(null);

		const localUsers = clientStorage.getUsers();

		const result = await signIn("credentials", {
			redirect: false,
			email: data.email.trim().toLowerCase(),
			password: data.password,
			localUsers: JSON.stringify(localUsers),
		});

		setLoading(false);

		if (result?.error) {
			setGlobalError("Invalid email or password");
		} else {
			window.location.href = "/";
		}
	};

	return (
		<div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-[#F5F6F8]">
			{/* ─────────────────────────────────────────────────────────────
			    LEFT BRANDING PANEL (Desktop 50%, Tablet 45-50%, Hidden Mobile)
			    ───────────────────────────────────────────────────────────── */}
			<div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between py-8 px-10 xl:py-10 xl:px-14 overflow-hidden bg-gradient-to-br from-[#0B132B] via-[#121E38] to-[#0B1120] text-white border-r border-slate-800/80 select-none">
				{/* Ambient Background Glow / Subtle Geometric Decoration */}
				<div
					aria-hidden="true"
					className="absolute -top-32 -left-32 w-80 h-80 bg-[#1E88E5]/20 rounded-full blur-3xl pointer-events-none"
				/>
				<div
					aria-hidden="true"
					className="absolute top-1/3 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#1E88E5]/15 rounded-full blur-3xl pointer-events-none"
				/>
				<div
					aria-hidden="true"
					className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#26A69A]/15 rounded-full blur-3xl pointer-events-none"
				/>
				<div
					aria-hidden="true"
					className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-70"
				/>

				{/* 1. Logo Section (Refined Emblem + Brand Name) */}
				<div className="relative z-10 flex items-center gap-3 shrink-0 mb-6 xl:mb-8">
					<div className="w-9 h-9 bg-gradient-to-br from-[#1E88E5] via-[#1976D2] to-[#1565C0] rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#1E88E5]/30 border border-[#90CAF9]/40 ring-1 ring-white/15 select-none">
						T
					</div>
					<span className="font-bold text-xl xl:text-2xl tracking-tight text-white">
						TaskBoard
					</span>
				</div>

				{/* 2. Hero Heading & Feature Highlights */}
				<div className="relative z-10 my-auto max-w-lg">
					{/* Hero Headline */}
					<h1 className="text-3xl sm:text-[34px] xl:text-[38px] font-extrabold tracking-[-0.03em] text-white leading-[1.14]">
						Manage Projects
						<br />
						Collaborate Better
						<br />
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-[#2DD4BF]">
							Deliver Faster
						</span>
					</h1>

					{/* Description */}
					<p className="mt-3 text-sm xl:text-[15px] text-slate-300/90 leading-relaxed max-w-md">
						Plan projects, manage sprints, track progress, collaborate with your
						team, and deliver work efficiently from one platform.
					</p>

					{/* Feature Highlights with Perfect Alignment & Consistent 20px Icons */}
					<div className="mt-6 space-y-3 xl:space-y-3.5">
						{/* Feature 1 */}
						<div className="group flex items-start gap-3.5 p-2 rounded-xl transition-all duration-200 hover:bg-white/[0.04]">
							<div className="w-10 h-10 rounded-xl bg-[#1E88E5]/20 text-[#60A5FA] border border-[#1E88E5]/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform duration-200">
								<FolderKanban className="w-5 h-5" />
							</div>
							<div className="pt-0.5">
								<h2 className="text-sm xl:text-[15px] font-semibold text-white tracking-tight leading-snug">
									Project Management
								</h2>
								<p className="text-xs xl:text-[13px] text-slate-400 leading-relaxed mt-0.5">
									Manage multiple projects, agile sprint backlogs, and
									interactive Kanban boards with ease.
								</p>
							</div>
						</div>

						{/* Feature 2 */}
						<div className="group flex items-start gap-3.5 p-2 rounded-xl transition-all duration-200 hover:bg-white/[0.04]">
							<div className="w-10 h-10 rounded-xl bg-[#26A69A]/20 text-[#2DD4BF] border border-[#26A69A]/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform duration-200">
								<Users className="w-5 h-5" />
							</div>
							<div className="pt-0.5">
								<h2 className="text-sm xl:text-[15px] font-semibold text-white tracking-tight leading-snug">
									Team Collaboration
								</h2>
								<p className="text-xs xl:text-[13px] text-slate-400 leading-relaxed mt-0.5">
									Assign tasks, monitor real-time progress, and collaborate
									seamlessly across teams.
								</p>
							</div>
						</div>

						{/* Feature 3 */}
						<div className="group flex items-start gap-3.5 p-2 rounded-xl transition-all duration-200 hover:bg-white/[0.04]">
							<div className="w-10 h-10 rounded-xl bg-[#7B61FF]/20 text-[#A78BFA] border border-[#7B61FF]/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform duration-200">
								<BarChart3 className="w-5 h-5" />
							</div>
							<div className="pt-0.5">
								<h2 className="text-sm xl:text-[15px] font-semibold text-white tracking-tight leading-snug">
									Analytics & Reports
								</h2>
								<p className="text-xs xl:text-[13px] text-slate-400 leading-relaxed mt-0.5">
									Gain insights through real-time dashboards, sprint velocity,
									and completion reports.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* 3. Refined Elegant Testimonial Card */}
				<div className="relative z-10 shrink-0">
					<div className="bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-white/[0.07]">
						{/* Rating Stars */}
						<div className="flex items-center gap-1 mb-1.5">
							{[...Array(5)].map((_, i) => (
								<Star
									key={i}
									className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"
								/>
							))}
							<span className="text-[11px] text-slate-300 ml-1.5 font-medium">
								5.0 Rating
							</span>
						</div>

						{/* Quote */}
						<p className="text-xs xl:text-sm text-slate-200/90 leading-relaxed italic">
							&ldquo;This platform has transformed how our team plans and
							delivers projects.&rdquo;
						</p>

						{/* Author */}
						<div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/10">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1E88E5] to-[#7B61FF] flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white/20 shrink-0">
									SW
								</div>
								<div>
									<div className="text-xs font-semibold text-white leading-tight">
										Sarah Wilson
									</div>
									<div className="text-[11px] text-slate-400">
										Project Manager
									</div>
								</div>
							</div>

							<div className="flex items-center gap-1 text-[10px] text-[#2DD4BF] font-medium bg-[#26A69A]/10 px-2 py-0.5 rounded-full border border-[#26A69A]/20">
								<CheckCircle2 className="w-3 h-3" />
								<span>Verified</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ─────────────────────────────────────────────────────────────
			    RIGHT LOGIN SECTION (Desktop 50%, Full width on Mobile)
			    ───────────────────────────────────────────────────────────── */}
			<div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
				<div className="max-w-[460px] w-full bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#E0E3E8] p-8 sm:p-10 md:p-12 transition-shadow duration-200">
					{/* Header */}
					<div className="text-center mb-8">
						<div className="w-12 h-12 bg-gradient-to-tr from-[#1E88E5] to-[#1876C4] rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-[#1E88E5]/20 border border-[#90CAF9]/40">
							T
						</div>
						<h2 className="text-2xl sm:text-[26px] font-bold text-[#33475B] tracking-tight mb-1.5">
							Sign in to your account
						</h2>
						<p className="text-sm text-[#6E7B8B]">
							Welcome back! Please enter your details.
						</p>
					</div>

					{/* Global Error Banner */}
					{globalError && (
						<div className="mb-5 p-3.5 bg-[#FFEBEE] text-[#E53935] text-sm rounded-lg flex items-center gap-2.5 border border-[#EF9A9A] animate-fadeIn">
							<AlertCircle className="w-4 h-4 flex-shrink-0" />
							<span>{globalError}</span>
						</div>
					)}

					{/* Existing Functional Login Form */}
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

						<div className="relative">
							<Input
								label="Password"
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								leftIcon={<Lock className="h-5 w-5" />}
								error={errors.password?.message}
								required
								{...register("password")}
								className="[&::-ms-reveal]:hidden pr-10"
							/>
							<button
								type="button"
								className={`absolute right-3 flex items-center text-[#9EAAB7] hover:text-[#33475B] focus:outline-none transition-colors ${
									errors.password ? "top-8" : "inset-y-0 mt-6"
								}`}
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<Eye className="h-4 w-4" />
								) : (
									<EyeOff className="h-4 w-4" />
								)}
							</button>
						</div>

						<Button
							type="submit"
							className="w-full mt-3 h-11 text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all"
							isLoading={loading || isSubmitting}
						>
							Sign In
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
