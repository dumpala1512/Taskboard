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

	// 2. Handle HTTP Methods
	switch (req.method) {
		case "GET":
			try {
				const users = await adminService.getAllUsers();
				// Don't send password hashes to the client
				const safeUsers = users.map(({ passwordHash, ...user }) => user);
				return res.status(200).json(safeUsers);
			} catch (error) {
				return res.status(500).json({ message: "Failed to fetch users" });
			}

		case "POST":
			try {
				const { name, email, role, status, password } = req.body;

				if (!name || !email || !role || !status || !password) {
					return res.status(400).json({ message: "Missing required fields" });
				}

				const [firstName, ...rest] = (name as string).split(" ");
				const lastName = rest.join(" ") || "";

				const { user } = await adminService.createUser({
					firstName,
					lastName,
					email,
					role,
				});

				const { passwordHash, ...safeUser } = user;
				return res.status(201).json(safeUser);
			} catch (error: any) {
				if (error.message === "Email is already registered") {
					return res.status(409).json({ message: error.message });
				}
				return res.status(500).json({ message: "Failed to create user" });
			}

		default:
			return res.status(405).json({ message: "Method not allowed" });
	}
}
