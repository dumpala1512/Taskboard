import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { projectService } from "../../../server/services/project.service";
import { authOptions } from "../auth/[...nextauth]";
import { attachDeletedHeaders } from "../../../server/data";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	attachDeletedHeaders(res);
	const session = await getServerSession(req, res, authOptions);
	if (!session || !session.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const userId = (session.user as any).id;
	const userEmail = session.user.email;
	const userRole = (session.user as any).role;

	switch (req.method) {
		case "GET":
			try {
				const projects = await projectService.getAllProjects(userId, userRole, userEmail || undefined);
				return res.status(200).json(projects);
			} catch (error) {
				console.error("Error fetching projects:", error);
				return res.status(500).json({ message: "Internal server error" });
			}

		case "POST":
			try {
				if (userRole !== "ADMIN") {
					return res
						.status(403)
						.json({ message: "Forbidden: Admin access required" });
				}

				const data = req.body;

				// Basic validation
				if (!data.name || !data.description || !data.status) {
					return res.status(400).json({ message: "Missing required fields" });
				}

				const newProject = await projectService.createProject({
					name: data.name,
					description: data.description,
					status: data.status,
					progress: data.progress || 0,
					ownerId: data.ownerId || userId,
					members: data.members || [],
					tags: data.tags || [],
					startDate: data.startDate || undefined,
					dueDate: data.dueDate || undefined,
					key: data.key || undefined,
				}, userId);

				return res.status(201).json(newProject);
			} catch (error: any) {
				console.error("Error creating project:", error);
				return res.status(500).json({ message: "Failed to create project" });
			}

		default:
			return res.status(405).json({ message: "Method not allowed" });
	}
}
