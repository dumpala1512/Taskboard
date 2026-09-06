import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";
import { authService } from "../../../server/services/auth.service";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const session = await getServerSession(req, res, authOptions);

		if (!session?.user?.email) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const userId = (session.user as any).id;
		const userEmail = session.user.email;
		
		await authService.setupAccount(userId, currentPassword, newPassword, userEmail);

		return res.status(200).json({ message: "Account setup successful" });
	} catch (error: any) {
		console.error("Account setup error:", error);
		return res.status(400).json({ message: error.message || "Failed to setup account" });
	}
}
