import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { deletedProjectIds, deletedUserIds, deletedTaskIds, loadDb } from "../../server/data";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await getServerSession(req, res, authOptions);
	if (!session || !session.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	loadDb();
	return res.status(200).json({
		deletedProjectIds: Array.from(deletedProjectIds),
		deletedUserIds: Array.from(deletedUserIds),
		deletedTaskIds: Array.from(deletedTaskIds),
	});
}
