import { Bell, ChevronRight, Menu, Search, User } from "lucide-react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useActivities } from "../../hooks/useActivities";
import { CreateUserModal } from "../members/CreateUserModal";
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
	const isAdmin = (session?.user as any)?.role === "ADMIN";
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [createNewOpen, setCreateNewOpen] = useState(false);
	const [projectWizardOpen, setProjectWizardOpen] = useState(false);
	const [taskWizardOpen, setTaskWizardOpen] = useState(false);
	const [createUserOpen, setCreateUserOpen] = useState(false);

	const [allRead, setAllRead] = useState(false);
	const { data: activities } = useActivities();
	const hasUnread =
		!allRead &&
		activities &&
		activities.some(
			(act, index) =>
				act.isRead === false || (act.isRead === undefined && index < 2),
		);

	// Simple breadcrumb generation
	const pathSegments = router.pathname.split("/").filter(Boolean);
	const breadcrumbs = [
		"Dashboard",
		...pathSegments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
	];

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
					{breadcrumbs.map((crumb, index) => (
						<React.Fragment key={crumb}>
							<span
								className={
									index === breadcrumbs.length - 1
										? "text-[#33475B] font-semibold text-sm"
										: "text-sm"
								}
							>
								{crumb}
							</span>
							{index < breadcrumbs.length - 1 && (
								<ChevronRight className="w-3.5 h-3.5 mx-1.5 text-[#9EAAB7]" />
							)}
						</React.Fragment>
					))}
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

				{/* Add Member Button (Only on Members page) */}
				{isAdmin && router.pathname.startsWith("/members") && (
					<button
						onClick={() => setCreateUserOpen(true)}
						className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium px-4 py-1.5 rounded-full transition-colors mr-2"
					>
						Add Member
					</button>
				)}

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

				{/* Avatar */}
				<div className="h-7 w-7 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#1E88E5] text-xs font-semibold border border-[#90CAF9] cursor-pointer select-none">
					{session?.user?.name ? (
						session.user.name.charAt(0).toUpperCase()
					) : (
						<User className="w-4 h-4" />
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

			<CreateUserModal
				isOpen={createUserOpen}
				onClose={() => setCreateUserOpen(false)}
				onSuccess={() => {
					// Invalidate users list so the newly created user shows up immediately
					queryClient.invalidateQueries({ queryKey: ["admin-users"] });
					queryClient.invalidateQueries({ queryKey: ["users"] });
					
					// We do not close the modal here because the modal shows the temporary password.
					// The modal will be closed when the user clicks 'Done' which triggers onClose.
				}}
			/>
		</header>
	);
};
