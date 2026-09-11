import { Shield, Users } from "lucide-react";
import React, { useState } from "react";
import type { UserDetailed } from "../../hooks/useUsers";
import { EmptyState } from "../ui/EmptyState";
import MemberProfileDrawer from "./MemberProfileDrawer";

interface MembersTableProps {
	users: UserDetailed[];
	searchTerm: string;
}

export default function MembersTable({ users, searchTerm }: MembersTableProps) {
	const [selectedUser, setSelectedUser] = useState<UserDetailed | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	// Deduplicate users by clean email or id so duplicate rows never appear
	const uniqueUsers: UserDetailed[] = [];
	const seenEmails = new Set<string>();
	const seenIds = new Set<string>();
	for (const u of users || []) {
		if (!u) continue;
		const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
		if (cleanEmail) {
			if (seenEmails.has(cleanEmail)) continue;
			seenEmails.add(cleanEmail);
		} else if (u.id) {
			if (seenIds.has(u.id)) continue;
			seenIds.add(u.id);
		}
		uniqueUsers.push(u);
	}

	const filteredUsers = uniqueUsers.filter((u) => {
		if (!u) return false;
		const term = (searchTerm || "").toLowerCase();
		const name = (
			u.name ||
			(u as any).firstName ||
			u.email ||
			""
		).toLowerCase();
		const email = (u.email || "").toLowerCase();
		const dept = (u.department || "").toLowerCase();
		return name.includes(term) || email.includes(term) || dept.includes(term);
	});

	const handleRowClick = (user: UserDetailed) => {
		setSelectedUser(user);
		setIsDrawerOpen(true);
	};

	return (
		<>
			<div className="bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-[#222F49] rounded-xl overflow-hidden shadow-sm">
				{filteredUsers.length === 0 ? (
					<div className="p-4 sm:p-6">
						<EmptyState
							icon={Users}
							title="No members found"
							description={
								searchTerm
									? "Try adjusting your search to find a team member."
									: "Invite members to your team to get started."
							}
						/>
					</div>
				) : (
					<>
						{/* Mobile Card List (< md) */}
						<div className="block md:hidden divide-y divide-slate-100 dark:divide-[#222F49]">
							{filteredUsers.map((user) => {
								const displayName =
									user.name ||
									(user as any).firstName ||
									user.email ||
									"Member";
								return (
									<div
										key={user.id || Math.random().toString()}
										className="p-3.5 hover:bg-slate-50 dark:hover:bg-[#1A233A] transition-colors cursor-pointer"
										onClick={() => handleRowClick(user)}
									>
										<div className="flex items-start gap-3">
											<img
												src={
													user.avatar ||
													`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e0e7ff&color=4f46e5`
												}
												alt={displayName}
												className="w-10 h-10 rounded-full border border-slate-200 dark:border-[#222F49] shrink-0"
											/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between gap-1 mb-0.5">
													<div className="flex items-center min-w-0 gap-1.5">
														<span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
															{displayName}
														</span>
														{user.role === "ADMIN" && (
															<span title="Admin" className="shrink-0 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
																<Shield className="w-2.5 h-2.5 mr-0.5" />
																Admin
															</span>
														)}
													</div>
												</div>
												<p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">
													{user.email || "—"}
												</p>
												<div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
													<span className="truncate text-slate-600 dark:text-slate-300 font-medium">
														{user.jobTitle || user.department || "Team Member"}
													</span>
													<span className="shrink-0 ml-2">
														{user.joiningDate || user.createdAt
															? new Date(
																	user.joiningDate || user.createdAt,
																).toLocaleDateString("en-US", {
																	month: "short",
																	day: "numeric",
																	year: "numeric",
																})
															: "—"}
													</span>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Desktop Table (>= md) */}
						<div className="hidden md:block overflow-x-auto">
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="bg-slate-50 dark:bg-[#1A233A] border-b border-slate-200 dark:border-[#222F49] text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
										<th className="px-6 py-4">Name Of The Member</th>
										<th className="px-6 py-4">Email</th>
										<th className="px-6 py-4">Designation</th>
										<th className="px-6 py-4">Joining Date</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 dark:divide-[#222F49]">
									{filteredUsers.map((user) => {
										const displayName =
											user.name ||
											(user as any).firstName ||
											user.email ||
											"Member";
										return (
											<tr
												key={user.id || Math.random().toString()}
												className="hover:bg-slate-50 dark:hover:bg-[#1A233A] transition-colors cursor-pointer group"
												onClick={() => handleRowClick(user)}
											>
												<td className="px-6 py-4">
													<div className="flex items-center min-w-0">
														<img
															src={
																user.avatar ||
																`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e0e7ff&color=4f46e5`
															}
															alt={displayName}
															className="w-10 h-10 rounded-full mr-3 border border-slate-200 dark:border-[#222F49] shrink-0"
														/>
														<div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center min-w-0 w-full max-w-[200px] sm:max-w-xs">
															<span className="truncate">{displayName}</span>
															{user.role === "ADMIN" && (
																<span title="Admin" className="shrink-0">
																	<Shield className="w-3 h-3 text-indigo-500 ml-1.5" />
																</span>
															)}
														</div>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
														{user.email || "—"}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm text-slate-900 dark:text-slate-100">
														{user.jobTitle || user.department || "—"}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
													{user.joiningDate || user.createdAt
														? new Date(
																user.joiningDate || user.createdAt,
															).toLocaleDateString("en-US", {
																month: "long",
																day: "numeric",
																year: "numeric",
															})
														: "—"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>

			<MemberProfileDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				user={selectedUser}
			/>
		</>
	);
}
