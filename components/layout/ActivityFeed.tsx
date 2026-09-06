import React from "react";
import { Clock } from "lucide-react";
import type { ActivityItem } from "../../hooks/useActivities";

interface ActivityFeedProps {
	activities?: (ActivityItem | any)[];
	isLoading?: boolean;
	compact?: boolean;
	markedAllRead?: boolean;
}

export function ActivityFeed({
	activities,
	isLoading,
	compact,
	markedAllRead,
}: ActivityFeedProps) {
	if (isLoading) {
		return <div className="text-sm text-gray-500 py-4 text-center">Loading activities...</div>;
	}

	if (!activities || activities.length === 0) {
		return <div className="text-sm text-gray-500 py-4 text-center">No recent activity.</div>;
	}

	return (
		<div className="space-y-4">
			{activities.map((activity) => {
				const title = activity.type ? activity.type.replace(/_/g, " ") : "Activity";
				const details = activity.target || activity.details || "";
				const time = activity.timestamp || activity.createdAt;
				const userName = activity.user?.name;

				return (
					<div key={activity.id} className="flex gap-3 items-start">
						<div className="w-8 h-8 rounded-full bg-[#E3F2FD] flex items-center justify-center shrink-0 mt-0.5">
							<Clock className="w-4 h-4 text-[#1E88E5]" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-sm text-gray-900 leading-snug">
								{userName && (
									<span className="font-semibold mr-1 text-[#33475B]">
										{userName}
									</span>
								)}
								<span className="font-medium text-gray-700">{title}</span>
								{details && (
									<span className="mx-1 text-gray-500">{details}</span>
								)}
							</div>
							{time && (
								<div className="text-xs text-gray-400 mt-1">
									{new Date(time).toLocaleString()}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
