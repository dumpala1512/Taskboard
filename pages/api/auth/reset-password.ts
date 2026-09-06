import type { NextApiRequest, NextApiResponse } from "next";
import { authService } from "../../../server/services/auth.service";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const { token, password } = req.body;

		if (!token || !password) {
			return res
				.status(400)
				.json({ message: "Token and password are required" });
		}

		try {
			const result = await authService.resetPassword(token, password);
			return res
				.status(200)
				.json({
					message: "Password has been reset successfully",
					email: result.email,
					passwordHash: result.passwordHash,
				});
		} catch (e: any) {
			if (e.message === "Invalid or expired token") {
				return res.status(400).json({ message: e.message });
			}
			throw e;
		}
	} catch (error) {
		console.error("Reset password error:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
