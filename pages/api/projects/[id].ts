import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { projectService } from "../../../server/services/project.service";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const session = await getServerSession(req, res, authOptions);
	if (!session || !session.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const userRole = (session.user as any).role;
	const { id } = req.query;

	if (!id || typeof id !== "string") {
		return res.status(400).json({ message: "Invalid project ID" });
	}

	switch (req.method) {
		case "GET":
			try {
				const project = await projectService.getProjectById(id as string);
				if (!project)
					return res.status(404).json({ message: "Project not found" });

				const userId = (session.user as any).id;
				if (
					userRole !== "ADMIN" &&
					!project.members?.includes(userId) &&
					project.ownerId !== userId
				) {
					return res.status(404).json({ message: "Project not found" });
				}

				return res.status(200).json(project);
			} catch (error) {
				return res.status(500).json({ message: "Failed to fetch project" });
			}

		case "PATCH":
			if (userRole !== "ADMIN") {
				return res
					.status(403)
					.json({ message: "Forbidden: Admin access required" });
			}
			try {
				const updates = req.body;
				const userId = (session.user as any).id;
				const updatedProject = await projectService.updateProject(id, updates, userId);
				return res.status(200).json(updatedProject);
			} catch (error: any) {
				if (error.message === "Project not found") {
					return res.status(404).json({ message: error.message });
				}
				return res.status(500).json({ message: "Failed to update project" });
			}

		case "DELETE":
			if (userRole !== "ADMIN") {
				return res
					.status(403)
					.json({ message: "Forbidden: Admin access required" });
			}
			try {
				await projectService.deleteProject(id);
				return res
					.status(200)
					.json({ message: "Project deleted successfully" });
			} catch (error: any) {
				if (error.message === "Project not found") {
					return res.status(404).json({ message: error.message });
				}
				return res.status(500).json({ message: "Failed to delete project" });
			}

		default:
			return res.status(405).json({ message: "Method not allowed" });
	}
}
