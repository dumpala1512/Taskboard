import {
	BarChart2,
	FolderOpen,
	LayoutDashboard,
	LogOut,
	Settings,
	User as UserIcon,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import type React from "react";

interface SidebarProps {
	isMobileOpen: boolean;
	setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
	isMobileOpen,
	setMobileOpen,
}) => {
	const router = useRouter();
	const { data: session } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";

	const navItems = [
		{ name: "Dashboard", href: "/", icon: LayoutDashboard },
		{ name: "Projects", href: "/projects", icon: FolderOpen },
		...(isAdmin ? [{ name: "Members", href: "/members", icon: Users }] : []),
		{ name: "Analytics", href: "/analytics", icon: BarChart2 },
	];

	const NavItem = ({ item }: { item: (typeof navItems)[0] }) => {
		const isActive = router.pathname === item.href;
		const Icon = item.icon;

		return (
			<Link
				href={item.href}
				className={`relative flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all duration-150 ${
					isActive
						? "bg-[#E3F2FD] text-[#1E88E5]"
						: "text-[#33475B] hover:bg-[#EEF0F3] hover:text-[#1E88E5]"
				}`}
				onClick={() => setMobileOpen(false)}
			>
				{isActive && (
					<span className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#1E88E5] rounded-r-full" />
				)}
				<Icon
					className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-[#1E88E5]" : "text-[#6E7B8B]"}`}
				/>
				<span>{item.name}</span>
			</Link>
		);
	};

	return (
		<>
			{/* Mobile Overlay */}
			{isMobileOpen && (
				<div
					className="fixed inset-0 bg-[#33475B]/40 z-40 xl:hidden"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			{/* Sidebar Content — Zoho Sprints light sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-[230px] bg-[#FAFBFC] border-r border-[#E0E3E8] transform transition-transform duration-200 ease-in-out xl:translate-x-0 xl:static xl:w-[230px] flex flex-col shadow-[1px_0_0_#E0E3E8] ${
					isMobileOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* Logo / Brand */}
				<div className="flex items-center h-14 px-5 border-b border-[#E0E3E8]">
					<div className="w-7 h-7 bg-[#1E88E5] rounded flex items-center justify-center text-white font-bold text-sm mr-2.5 flex-shrink-0">
						T
					</div>
					<span className="text-lg font-semibold text-[#33475B] tracking-tight">
						TaskBoard
					</span>
				</div>

				{/* Main nav */}
				<div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5">
					{navItems.map((item) => (
						<NavItem key={item.name} item={item} />
					))}
				</div>

				{/* Bottom nav */}
				<div className="px-2.5 pb-3 pt-2 border-t border-[#E0E3E8] space-y-0.5">
					<button
						onClick={() => signOut({ callbackUrl: "/auth/signin" })}
						className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium text-[#6E7B8B] hover:bg-[#FFEBEE] hover:text-[#E53935] transition-all duration-150"
					>
						<LogOut className="w-[18px] h-[18px] flex-shrink-0" />
						<span>Logout</span>
					</button>
				</div>
			</aside>
		</>
	);
};
