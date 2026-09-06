import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminService } from "../../../server/services/admin.service";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
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
				return res.status(400).json({ message: "Cannot delete your own account" });
			}

			await adminService.deleteUser(id);
			return res.status(200).json({ message: "User deleted successfully" });
		} catch (error: any) {
			console.error("Error deleting user:", error);
			return res.status(500).json({ message: error.message || "Internal server error" });
		}
	}

	return res.status(405).json({ message: "Method not allowed" });
}
