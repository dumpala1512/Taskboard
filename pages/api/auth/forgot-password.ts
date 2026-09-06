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
		const { email } = req.body;

		if (!email) {
			return res.status(400).json({ message: "Email is required" });
		}

		console.log("Forgot password API called with email:", email);

		// Process the reset request
		await authService.requestPasswordReset(email);

		// ALWAYS return 200 to prevent email enumeration
		return res.status(200).json({
			message:
				"If an account exists with this email address, a password reset link has been sent.",
		});
	} catch (error) {
		console.error("Forgot password error:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
