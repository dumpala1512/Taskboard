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

	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		if ((session.user as any).role === "ADMIN") {
			const usersWithStats = await adminService.getAllUsersWithStats();
			return res.status(200).json(usersWithStats);
		} else {
			// Even regular members can see the basic list of users (to assign tasks/projects)
			const users = await adminService.getAllUsers();
			
			// Return only safe fields (id, name, email, avatar) for members
			const safeUsers = users.map(u => ({
				id: u.id,
				name: u.name,
				email: u.email,
				avatar: u.avatar,
			}));

			return res.status(200).json(safeUsers);
		}
	} catch (error) {
		console.error("Error fetching users directory:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
