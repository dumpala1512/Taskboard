import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { adminService } from "../../../../server/services/admin.service";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	// 1. RBAC Authentication Check
	const session = await getServerSession(req, res, authOptions);

	if (!session || (session.user as any).role !== "ADMIN") {
		return res
			.status(403)
			.json({ message: "Forbidden: Admin access required" });
	}

	const { id } = req.query;

	if (!id || typeof id !== "string") {
		return res.status(400).json({ message: "Invalid user ID" });
	}

	// 2. Handle HTTP Methods
	switch (req.method) {
		case "PATCH":
			try {
				const updates = req.body;
				const updatedUser = await adminService.updateUser(id, updates);
				const { passwordHash, ...safeUser } = updatedUser;
				return res.status(200).json(safeUser);
			} catch (error: any) {
				if (error.message === "User not found") {
					return res.status(404).json({ message: error.message });
				}
				return res.status(500).json({ message: "Failed to update user" });
			}

		case "DELETE":
			try {
				// Prevent deleting yourself
				if (id === (session.user as any).id) {
					return res
						.status(400)
						.json({ message: "Cannot delete your own admin account" });
				}

				await adminService.deleteUser(id);
				return res.status(200).json({ message: "User deleted successfully" });
			} catch (error: any) {
				if (error.message === "User not found") {
					return res.status(404).json({ message: error.message });
				}
				return res.status(500).json({ message: "Failed to delete user" });
			}

		default:
			return res.status(405).json({ message: "Method not allowed" });
	}
}
