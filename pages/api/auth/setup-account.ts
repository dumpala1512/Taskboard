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

		const { currentPassword, newPassword, email: bodyEmail, userId: bodyUserId } = req.body;

		const userEmail = session?.user?.email || bodyEmail;
		const userId = (session?.user as any)?.id || bodyUserId;

		if (!userEmail) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ message: "Missing required fields" });
		}
		
		const updated = await authService.setupAccount(userId || userEmail, currentPassword, newPassword, userEmail);

		return res.status(200).json({
			message: "Account setup successful",
			user: {
				id: updated.id,
				email: updated.email,
				isFirstLogin: false,
			},
			passwordHash: updated.passwordHash,
		});
	} catch (error: any) {
		console.error("Account setup error:", error);
		return res.status(400).json({ message: error.message || "Failed to setup account" });
	}
}
