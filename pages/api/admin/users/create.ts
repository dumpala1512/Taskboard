import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { adminService } from "../../../../server/services/admin.service";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const session = await getServerSession(req, res, authOptions);

		if ((session?.user as any)?.role !== "ADMIN") {
			return res.status(403).json({ message: "Forbidden" });
		}

		const { fullName, name, firstName, lastName, email, role, department, jobTitle, phone, joiningDate } =
			req.body;

		const displayName = (fullName || name || `${firstName || ""} ${lastName || ""}`).trim();

		if (!displayName || !email || !role) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const createdBy = (session?.user as any)?.id;

		const { user, temporaryPasswordPlain } = await adminService.createUser({
			fullName: displayName,
			name: displayName,
			firstName,
			lastName,
			email,
			role,
			department,
			jobTitle,
			phone,
			joiningDate,
			createdBy,
		});

		// Remove password hash from response
		const { passwordHash, ...safeUser } = user;

		return res.status(201).json({
			user: safeUser,
			temporaryPassword: temporaryPasswordPlain,
		});
	} catch (error: any) {
		console.error("Create user error:", error);
		return res
			.status(400)
			.json({ message: error.message || "Failed to create user" });
	}
}
