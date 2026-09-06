import type React from "react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isMobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden bg-[#F5F6F8] font-sans">
			<Sidebar isMobileOpen={isMobileOpen} setMobileOpen={setMobileOpen} />

			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<TopNav setMobileOpen={setMobileOpen} />

				<main className="flex-1 overflow-y-auto">
					<div className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</div>
				</main>
			</div>
		</div>
	);
};
