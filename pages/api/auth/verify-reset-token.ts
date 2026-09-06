import type { NextApiRequest, NextApiResponse } from "next";
import { userRepository } from "../../../server/repositories/user.repository";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const { token } = req.query;

		if (!token || typeof token !== "string") {
			return res.status(400).json({ message: "Invalid token" });
		}

		const user = await userRepository.findByResetToken(token);

		if (!user) {
			return res.status(400).json({ message: "Invalid or expired token" });
		}

		if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
			return res.status(400).json({ message: "Invalid or expired token" });
		}

		return res.status(200).json({ message: "Token is valid" });
	} catch (error) {
		console.error("Verify token error:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
