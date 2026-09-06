import {
	Building2,
	Calendar,
	Mail,
	Phone,
	Shield,
	Trash2,
	User,
	X,
} from "lucide-react";
import React from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useDeleteUser, type UserDetailed } from "../../hooks/useUsers";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Portal } from "../ui/Portal";

interface MemberProfileDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	user: UserDetailed | null;
}

export default function MemberProfileDrawer({
	isOpen,
	onClose,
	user,
}: MemberProfileDrawerProps) {
	const { data: session } = useSession();
	const deleteUser = useDeleteUser();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

	const handleDeleteUser = async () => {
		if (!user) return;
		try {
			await deleteUser.mutateAsync(user.id);
			toast.success("User deleted successfully");
			setIsDeleteDialogOpen(false);
			onClose();
		} catch (error: any) {
			toast.error(
				error?.response?.data?.message ||
					error.message ||
					"Failed to delete user",
			);
		}
	};

	if (!isOpen || !user) return null;

	const formattedJoiningDate = user.joiningDate || user.createdAt
		? new Date(user.joiningDate || user.createdAt).toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
		  })
		: "—";

	return (
		<Portal>
			<div
				className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] transition-opacity"
				onClick={onClose}
			/>

			<div className="fixed inset-y-0 right-0 w-full sm:w-1/2 bg-white shadow-2xl z-[101] transform transition-transform duration-300 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-200">
					<h2 className="text-lg font-semibold text-slate-900">
						Member Profile
					</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Profile Header */}
					<div className="flex items-start gap-4 pb-6 border-b border-slate-100">
						<img
							src={
								user.avatar ||
								`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e0e7ff&color=4f46e5&size=80`
							}
							alt={user.name}
							className="w-20 h-20 rounded-full border border-slate-200 shrink-0 object-cover"
						/>
						<div className="min-w-0 flex-1">
							<h3 className="text-xl font-bold text-slate-900 truncate">{user.name}</h3>
							<p className="text-sm text-slate-500 truncate">{user.email}</p>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<span
									className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
										user.role === "ADMIN"
											? "bg-purple-100 text-purple-700"
											: "bg-blue-100 text-blue-700"
									}`}
								>
									{user.role === "ADMIN" && <Shield className="w-3 h-3" />}
									{user.role || "MEMBER"}
								</span>
								<span
									className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
										user.status === "ACTIVE"
											? "bg-emerald-100 text-emerald-700"
											: "bg-amber-100 text-amber-700"
									}`}
								>
									{user.status || "ACTIVE"}
								</span>
							</div>
						</div>
					</div>

					{/* Member Details */}
					<div className="space-y-4">
						<h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
							Member Information
						</h4>

						<div className="grid grid-cols-1 gap-3">
							<div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
								<Mail className="w-4 h-4 text-slate-400 shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="text-xs text-slate-500">Email Address</p>
									<p className="text-sm font-medium text-slate-900 truncate">
										{user.email || "—"}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
								<User className="w-4 h-4 text-slate-400 shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="text-xs text-slate-500">Designation / Role</p>
									<p className="text-sm font-medium text-slate-900 truncate">
										{user.jobTitle || user.role || "—"}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
								<Building2 className="w-4 h-4 text-slate-400 shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="text-xs text-slate-500">Department</p>
									<p className="text-sm font-medium text-slate-900 truncate">
										{user.department || "—"}
									</p>
								</div>
							</div>

							{user.phone && (
								<div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
									<Phone className="w-4 h-4 text-slate-400 shrink-0" />
									<div className="min-w-0 flex-1">
										<p className="text-xs text-slate-500">Phone</p>
										<p className="text-sm font-medium text-slate-900 truncate">
											{user.phone}
										</p>
									</div>
								</div>
							)}

							<div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
								<Calendar className="w-4 h-4 text-slate-400 shrink-0" />
								<div className="min-w-0 flex-1">
									<p className="text-xs text-slate-500">Member Since</p>
									<p className="text-sm font-medium text-slate-900 truncate">
										{formattedJoiningDate}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Danger Zone */}
					{session?.user?.email !== user.email && (
						<div className="pt-6 border-t border-red-100">
							<h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">
								Danger Zone
							</h4>
							<div className="bg-red-50 p-4 rounded-lg border border-red-100">
								<p className="text-sm text-red-800 mb-3">
									Deleting this user will permanently remove them from the system.
									This action cannot be undone.
								</p>
								<button
									onClick={() => setIsDeleteDialogOpen(true)}
									className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
								>
									<Trash2 className="w-4 h-4" />
									Delete User
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			<ConfirmDialog
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteUser}
				title="Delete User"
				description={`Are you sure you want to delete ${user?.name}? This action cannot be undone and they will lose access to all projects and tasks.`}
				confirmText="Delete User"
				cancelText="Cancel"
				isProcessing={deleteUser.isPending}
			/>
		</Portal>
	);
}
