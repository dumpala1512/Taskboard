import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { adminService } from "../../../server/services/admin.service";
import { authOptions } from "../auth/[...nextauth]";
import { attachDeletedHeaders } from "../../../server/data";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	attachDeletedHeaders(res);
	const session = await getServerSession(req, res, authOptions);
	if (!session || !session.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const { id } = req.query;

	if (!id || typeof id !== "string") {
		return res.status(400).json({ message: "Invalid user ID" });
	}

	if (req.method === "DELETE") {
		try {
			if ((session.user as any).role !== "ADMIN") {
				return res.status(403).json({ message: "Forbidden" });
			}

			// Prevent deleting oneself
			if (id === (session.user as any).id) {
				return res
					.status(400)
					.json({ message: "Cannot delete your own account" });
			}

			await adminService.deleteUser(id);
			return res.status(200).json({ message: "User deleted successfully" });
		} catch (error: any) {
			console.error("Error deleting user:", error);
			return res
				.status(500)
				.json({ message: error.message || "Internal server error" });
		}
	}

	if (req.method === "PATCH") {
		try {
			const isAdmin = (session.user as any).role === "ADMIN";
			const isSelf = (session.user as any).id === id || session.user.email === id;

			if (!isAdmin && !isSelf) {
				return res.status(403).json({ message: "Forbidden" });
			}

			const body = req.body || {};
			const updates: any = {};

			if (body.name) updates.name = body.name;
			if (body.firstName) updates.firstName = body.firstName;
			if (body.lastName) updates.lastName = body.lastName;
			if (body.department) updates.department = body.department;
			if (body.jobTitle) updates.jobTitle = body.jobTitle;
			if (body.phone) updates.phone = body.phone;
			if (body.avatar) updates.avatar = body.avatar;

			// Handle password update
			if (body.password) {
				updates.password = body.password;
			}

			if (isAdmin) {
				if (body.role) updates.role = body.role;
				if (body.status) updates.status = body.status;
			}

			const updatedUser = await adminService.updateUser(id, updates);
			const { passwordHash, ...safeUser } = updatedUser;
			return res.status(200).json(safeUser);
		} catch (error: any) {
			console.error("Error updating user:", error);
			if (error.message === "User not found") {
				return res.status(404).json({ message: error.message });
			}
			return res.status(500).json({ message: error.message || "Internal server error" });
		}
	}

	return res.status(405).json({ message: "Method not allowed" });
}
