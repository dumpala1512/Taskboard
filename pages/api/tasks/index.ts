import type { NextApiRequest, NextApiResponse } from "next";
import { taskService } from "../../../server/services/task.service";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "GET" && req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const projectId = req.query.projectId as string | undefined;

		if (req.method === "POST") {
			const session = await getServerSession(req, res, authOptions);
			const userId = session?.user ? (session.user as any).id : undefined;
			const task = await taskService.createTask(req.body, userId);
			return res.status(201).json(task);
		}

		if (req.method === "GET") {
			const session = await getServerSession(req, res, authOptions);
			const userId = session?.user ? (session.user as any).id : undefined;
			const role = session?.user ? (session.user as any).role : undefined;

			if (projectId) {
				const tasks = await taskService.getTasksByProjectId(projectId);
				return res.status(200).json(tasks);
			}

			const allTasks = await taskService.getAllTasks(userId, role);
			return res.status(200).json(allTasks);
		}
	} catch (error: any) {
		console.error("Error fetching/creating tasks:", error);
		if (error?.message === "Add the member to the project and then assign task") {
			return res.status(400).json({ message: error.message });
		}
		return res.status(500).json({ message: error?.message || "Internal server error" });
	}
}
