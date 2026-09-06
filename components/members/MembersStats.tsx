import { Briefcase, UserCheck, UserMinus, Users, UserX } from "lucide-react";
import React from "react";
import type { UserDetailed } from "../../hooks/useUsers";

interface MembersStatsProps {
	users: UserDetailed[];
}

export default function MembersStats({ users }: MembersStatsProps) {
	const total = users.length;
	const active = users.filter((u) => u.status === "ACTIVE").length;
	const inactive = users.filter((u) => u.status === "INACTIVE").length;
	const assigned = users.filter((u) => u.projectsAssigned > 0).length;
	const unassigned = total - assigned;

	const stats = [
		{
			label: "Total Members",
			value: total,
			icon: Users,
			color: "text-indigo-600",
			bg: "bg-indigo-100",
		},
		{
			label: "Active",
			value: active,
			icon: UserCheck,
			color: "text-green-600",
			bg: "bg-green-100",
		},
		{
			label: "Inactive",
			value: inactive,
			icon: UserX,
			color: "text-red-600",
			bg: "bg-red-100",
		},
		{
			label: "Assigned",
			value: assigned,
			icon: Briefcase,
			color: "text-blue-600",
			bg: "bg-blue-100",
		},
		{
			label: "Unassigned",
			value: unassigned,
			icon: UserMinus,
			color: "text-amber-600",
			bg: "bg-amber-100",
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
			{stats.map((stat, i) => {
				const Icon = stat.icon;
				return (
					<div
						key={i}
						className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
					>
						<div>
							<p className="text-sm font-medium text-slate-500">{stat.label}</p>
							<p className="text-2xl font-bold text-slate-900 mt-1">
								{stat.value}
							</p>
						</div>
						<div
							className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}
						>
							<Icon className="w-5 h-5" />
						</div>
					</div>
				);
			})}
		</div>
	);
}
