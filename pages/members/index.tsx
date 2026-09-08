import { Filter, Plus, Search } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import MembersStats from "../../components/members/MembersStats";
import MembersTable from "../../components/members/MembersTable";
import { CreateUserModal } from "../../components/members/CreateUserModal";
import { useAdminUsers } from "../../hooks/useUsers";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";

export default function MembersPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const isAdmin = (session?.user as any)?.role === "ADMIN";

	const { data: users, isLoading, error, refetch } = useAdminUsers();
	const [searchTerm, setSearchTerm] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	useEffect(() => {
		if (status !== "loading" && !isAdmin) {
			router.replace("/access-denied");
		}
	}, [status, isAdmin, router]);

	if (status === "loading" || !isAdmin) {
		return null;
	}

	const safeUsers = users || [];

	return (
		<AppLayout>
			<Head>
				<title>Members Management | Projects Workspace</title>
			</Head>

			<div className="flex flex-col h-full bg-slate-50">
				<div className="flex-1 overflow-auto">
					<div className="w-full space-y-4">
						{/* Header and Search */}
						<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-2 pb-4">
							<h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
							
							<div className="flex items-center gap-3">
								<div className="relative w-full sm:w-64">
									<Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
									<input
										type="text"
										placeholder="Search"
										className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/30 focus:border-[#1E88E5]"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
									/>
								</div>

								<Button
									variant="primary"
									leftIcon={<Plus className="w-4 h-4" />}
									onClick={() => setIsCreateModalOpen(true)}
								>
									Add Member
								</Button>
							</div>
						</div>

						{/* Members Table */}
						{isLoading ? (
							<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
								<div className="overflow-x-auto">
									<table className="w-full text-left border-collapse">
										<thead>
											<tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
												<th className="px-6 py-4">Name Of The Member</th>
												<th className="px-6 py-4">Email</th>
												<th className="px-6 py-4">Designation</th>
												<th className="px-6 py-4">Joining Date</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-200">
											{[1, 2, 3, 4, 5].map(i => (
												<tr key={i}>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center">
															<Skeleton className="w-10 h-10 rounded-full mr-3" />
															<Skeleton className="h-4 w-32" />
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-40" /></td>
													<td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
													<td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-32" /></td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : error ? (
							<div className="p-6 text-red-600 bg-red-50 rounded-xl border border-red-100">
								Failed to load members.
							</div>
						) : (
							<MembersTable users={safeUsers} searchTerm={searchTerm} />
						)}
					</div>
				</div>
			</div>

			<CreateUserModal 
				isOpen={isCreateModalOpen} 
				onClose={() => setIsCreateModalOpen(false)} 
				onSuccess={() => {
					refetch();
				}} 
			/>
		</AppLayout>
	);
}
