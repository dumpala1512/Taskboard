import { CheckCheck, Settings, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useActivities } from "../../hooks/useActivities";
import { ActivityFeed } from "./ActivityFeed";

interface NotificationsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	allRead: boolean;
	setAllRead: (read: boolean) => void;
}

export function NotificationsPanel({
	isOpen,
	onClose,
	allRead,
	setAllRead,
}: NotificationsPanelProps) {
	const { data: activities, isLoading } = useActivities();
	const [activeTab, setActiveTab] = useState("All");

	const tabs = ["All", "Unread"];

	// Mock unread filtering based on the same logic used in ActivityFeed (first 2 items)
	const displayedActivities = activities?.filter((act, index) => {
		if (activeTab === "Unread") {
			return (
				!allRead &&
				(act.isRead === false || (act.isRead === undefined && index < 2))
			);
		}
		return true;
	});

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			window.addEventListener("keydown", handleEsc);
		}
		return () => window.removeEventListener("keydown", handleEsc);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-[#33475B]/20 z-40 transition-opacity"
				onClick={onClose}
			/>

			{/* Slide-over panel */}
			<div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[40%] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] border-l border-[#E0E3E8] flex flex-col transform transition-transform duration-300 ease-in-out">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-3 border-b border-[#E0E3E8]">
					<div className="flex items-center gap-5">
						<h2 className="text-base font-semibold text-[#33475B]">
							Notifications
						</h2>
						{/* Tabs */}
						<div className="flex items-center gap-4">
							{tabs.map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`pb-0.5 text-xs font-medium border-b-2 transition-colors ${
										activeTab === tab
											? "border-[#1E88E5] text-[#1E88E5]"
											: "border-transparent text-[#6E7B8B] hover:text-[#33475B] hover:border-[#C8CDD4]"
									}`}
								>
									{tab}
								</button>
							))}
						</div>
					</div>

					<div className="flex items-center gap-1">
						<button
							title="Mark all as read"
							onClick={() => setAllRead(true)}
							className="p-1.5 text-[#6E7B8B] hover:bg-[#E3F2FD] hover:text-[#1E88E5] rounded-sm border border-[#E0E3E8] transition-colors"
						>
							<CheckCheck className="w-3.5 h-3.5" />
						</button>
						<div className="h-4 w-px bg-[#E0E3E8] mx-1" />
						<button
							onClick={onClose}
							title="Close"
							className="p-1.5 text-[#9EAAB7] hover:bg-[#FFEBEE] hover:text-[#E53935] rounded-sm border border-[#E0E3E8] transition-colors"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-5 bg-white">
					<ActivityFeed
						activities={displayedActivities as any}
						isLoading={isLoading}
						compact
						markedAllRead={allRead}
					/>
				</div>
			</div>
		</>
	);
}
