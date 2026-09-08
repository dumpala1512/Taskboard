import Link from "next/link";
import { Bell, ChevronRight, Menu, Moon, Search, Sun, User, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, useRef } from "react";
import { useActivities } from "../../hooks/useActivities";
import { useTheme } from "../../context/ThemeContext";
import { ProjectWizardModal } from "../projects/ProjectWizardModal";
import { TaskWizardModal } from "../tasks/TaskWizardModal";
import { CreateNewModal } from "./CreateNewModal";
import { NotificationsPanel } from "./NotificationsPanel";

interface TopNavProps {
	setMobileOpen: (open: boolean) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ setMobileOpen }) => {
	const router = useRouter();
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const { isDark, toggleTheme } = useTheme();
	const isAdmin = (session?.user as any)?.role === "ADMIN";
	const userRole = ((session?.user as any)?.role || "MEMBER").toUpperCase();
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [createNewOpen, setCreateNewOpen] = useState(false);
	const [projectWizardOpen, setProjectWizardOpen] = useState(false);
	const [taskWizardOpen, setTaskWizardOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const profileRef = useRef<HTMLDivElement>(null);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		await signOut({ callbackUrl: "/auth/signin" });
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
				setProfileOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const [allRead, setAllRead] = useState(false);
	const { data: activities } = useActivities();
	const hasUnread =
		!allRead &&
		activities &&
		activities.some(
			(act, index) =>
				act.isRead === false || (act.isRead === undefined && index < 2),
		);

	// Breadcrumb generation
	const getBreadcrumbs = () => {
		const pathname = router.pathname;

		// 1. Root / Dashboard paths
		if (
			pathname === "/" ||
			pathname === "/dashboard" ||
			pathname.startsWith("/admin/dashboard")
		) {
			return [{ label: "Dashboard", href: "/" }];
		}

		// 2. Project details: /projects/[id]
		if (pathname.startsWith("/projects/[id]")) {
			return [{ label: "Projects", href: "/projects" }];
		}

		// 3. Projects list: /projects
		if (pathname === "/projects") {
			return [{ label: "Projects", href: "/projects" }];
		}

		// 4. Members list: /members
		if (pathname.startsWith("/members")) {
			return [{ label: "Members", href: "/members" }];
		}

		// 5. Analytics: /analytics
		if (pathname.startsWith("/analytics")) {
			return [{ label: "Analytics", href: "/analytics" }];
		}

		// 6. Generic / Fallback paths
		const segments = pathname.split("/").filter(Boolean);
		const cleanedSegments = segments.filter((s, idx) => {
			if (s.toLowerCase() === "admin" && idx === 0) return false;
			return true;
		});

		let accumulatedPath = "";
		return cleanedSegments.map((segment, index) => {
			accumulatedPath += `/${segment}`;
			const isDynamic = segment.startsWith("[") && segment.endsWith("]");
			const paramKey = isDynamic ? segment.slice(1, -1) : "";
			const label = isDynamic
				? (router.query[paramKey] as string) || segment
				: segment.charAt(0).toUpperCase() + segment.slice(1);

			return {
				label,
				href: index < cleanedSegments.length - 1 ? accumulatedPath : "",
			};
		});
	};

	const breadcrumbs = getBreadcrumbs();

	return (
		<header className="h-14 bg-white border-b border-[#E0E3E8] flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 relative">
			<div className="flex items-center flex-1">
				<button
					onClick={() => setMobileOpen(true)}
					className="mr-4 text-[#6E7B8B] hover:text-[#33475B] xl:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E88E5] rounded p-1 transition-colors"
				>
					<Menu className="w-5 h-5" />
				</button>

				{/* Breadcrumb */}
				<nav
					aria-label="Breadcrumb"
					className="hidden sm:flex items-center text-sm text-[#6E7B8B]"
				>
					{breadcrumbs.map((crumb, index) => {
						const isLast = index === breadcrumbs.length - 1;
						return (
							<React.Fragment key={`${crumb.label}-${index}`}>
								{!isLast && crumb.href ? (
									<Link
										href={crumb.href}
										className="text-sm text-[#6E7B8B] hover:text-[#1E88E5] transition-colors"
									>
										{crumb.label}
									</Link>
								) : (
									<span
										className={
											isLast
												? "text-[#33475B] font-semibold text-sm"
												: "text-sm text-[#6E7B8B]"
										}
									>
										{crumb.label}
									</span>
								)}
								{!isLast && (
									<ChevronRight className="w-3.5 h-3.5 mx-1.5 text-[#9EAAB7]" />
								)}
							</React.Fragment>
						);
					})}
				</nav>
			</div>

			<div className="flex items-center gap-3">
				{/* Create Button */}
				{isAdmin &&
					!router.pathname.startsWith("/analytics") &&
					!router.pathname.startsWith("/members") &&
					!router.pathname.startsWith("/projects") && (
						<button
							onClick={() => setCreateNewOpen(true)}
							className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium px-4 py-1.5 rounded-full transition-colors mr-2"
						>
							Create
						</button>
					)}

				{/* Dark Mode Toggle */}
				<button
					onClick={toggleTheme}
					aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
					title={isDark ? "Switch to light mode" : "Switch to dark mode"}
					className="text-[#6E7B8B] hover:text-[#33475B] dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E88E5]/30 rounded-full p-1.5 hover:bg-[#EEF0F3] dark:hover:bg-slate-800 transition-colors"
				>
					{isDark ? (
						<Sun className="w-[18px] h-[18px] text-amber-400 hover:rotate-45 transition-transform duration-200" />
					) : (
						<Moon className="w-[18px] h-[18px] text-slate-600 hover:-rotate-12 transition-transform duration-200" />
					)}
				</button>

				{/* Notifications */}
				<button
					onClick={() => setNotificationsOpen(true)}
					className="relative text-[#6E7B8B] hover:text-[#33475B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E88E5]/30 rounded-full p-1.5 hover:bg-[#EEF0F3] transition-colors"
				>
					<Bell className="w-[18px] h-[18px]" />
					{hasUnread && (
						<span className="absolute top-1 right-1 w-2 h-2 bg-[#E53935] rounded-full border border-white" />
					)}
				</button>

				{/* Avatar with hover email & click dropdown */}
				<div ref={profileRef} className="relative group">
					<button
						onClick={() => setProfileOpen((prev) => !prev)}
						title={session?.user?.email || "User Profile"}
						className="h-7 w-7 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#1E88E5] text-xs font-semibold border border-[#90CAF9] hover:ring-2 hover:ring-[#1E88E5]/30 transition-all cursor-pointer select-none"
					>
						{session?.user?.name ? (
							session.user.name.charAt(0).toUpperCase()
						) : (
							<User className="w-4 h-4" />
						)}
					</button>

					{/* Hover Tooltip showing Email */}
					{!profileOpen && session?.user?.email && (
						<div className="absolute right-0 top-full mt-2 hidden group-hover:block z-40 whitespace-nowrap bg-slate-800 text-white text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none animate-in fade-in duration-150">
							{session.user.email}
							<div className="absolute -top-1 right-2.5 w-2 h-2 bg-slate-800 rotate-45" />
						</div>
					)}

					{/* Profile Dropdown Menu */}
					{profileOpen && (
						<div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
							{/* User Info Header */}
							<div className="flex items-center gap-3 pb-3 border-b border-slate-100">
								<div className="h-10 w-10 rounded-full bg-[#E3F2FD] text-[#1E88E5] font-bold text-sm flex items-center justify-center border border-[#90CAF9] shrink-0">
									{session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-slate-900 truncate" title={session?.user?.name || "User"}>
										{session?.user?.name || "User"}
									</p>
									<p className="text-xs text-slate-500 truncate" title={session?.user?.email || ""}>
										{session?.user?.email}
									</p>
								</div>
							</div>

							{/* Role & Status */}
							<div className="py-2.5 flex items-center justify-between">
								<span className="text-xs font-medium text-slate-500">Logged in as</span>
								<span
									className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
										userRole === "ADMIN"
											? "bg-indigo-100 text-indigo-700 border border-indigo-200"
											: "bg-emerald-100 text-emerald-700 border border-emerald-200"
									}`}
								>
									{userRole === "ADMIN" ? (
										<>
											<Shield className="w-3 h-3" /> Admin
										</>
									) : (
										<>
											<User className="w-3 h-3" /> Member
										</>
									)}
								</span>
							</div>

							<div className="pt-2 border-t border-slate-100 space-y-1">
								{isAdmin && (
									<Link
										href="/members"
										onClick={() => setProfileOpen(false)}
										className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
									>
										Manage Members
									</Link>
								)}
								<button
									disabled={isLoggingOut}
									onClick={handleLogout}
									className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
								>
									<LogOut className={`w-3.5 h-3.5 ${isLoggingOut ? "animate-pulse" : ""}`} />
									<span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			<NotificationsPanel
				isOpen={notificationsOpen}
				onClose={() => setNotificationsOpen(false)}
				allRead={allRead}
				setAllRead={setAllRead}
			/>

			<CreateNewModal
				isOpen={createNewOpen}
				onClose={() => setCreateNewOpen(false)}
				onCreate={(type) => {
					if (type === "project") {
						setProjectWizardOpen(true);
					} else {
						// sprint, story, task all use TaskWizardModal for now
						setTaskWizardOpen(true);
					}
				}}
			/>

			<ProjectWizardModal
				isOpen={projectWizardOpen}
				onClose={() => setProjectWizardOpen(false)}
			/>

			<TaskWizardModal
				isOpen={taskWizardOpen}
				onClose={() => setTaskWizardOpen(false)}
			/>
		</header>
	);
};
