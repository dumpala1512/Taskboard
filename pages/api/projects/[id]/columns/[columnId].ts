import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { projectService } from "../../../../../server/services/project.service";
import { authOptions } from "../../../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "DELETE") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const session = await getServerSession(req, res, authOptions);
	if (!session || !session.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const userRole = (session.user as any).role;
	if (userRole !== "ADMIN") {
		return res
			.status(403)
			.json({ message: "Forbidden: Admin access required" });
	}

	const { id, columnId } = req.query;

	if (!id || typeof id !== "string" || !columnId || typeof columnId !== "string") {
		return res.status(400).json({ message: "Invalid parameters" });
	}

	try {
		const userId = (session.user as any).id;
		const updatedProject = await projectService.deleteColumn(id, columnId, userId);
		return res.status(200).json(updatedProject);
	} catch (error: any) {
		if (error.message === "Project not found" || error.message === "Column not found") {
			return res.status(404).json({ message: error.message });
		}
		if (error.message === "Cannot delete the Backlog column") {
			return res.status(400).json({ message: error.message });
		}
		return res.status(500).json({ message: "Failed to delete column" });
	}
}
