import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { attachDeletedHeaders } from "../../../server/data";
import { taskService } from "../../../server/services/task.service";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	attachDeletedHeaders(res);
	const { id } = req.query;

	if (!id || typeof id !== "string") {
		return res.status(400).json({ message: "Invalid task ID" });
	}

	try {
		if (req.method === "PATCH") {
			const session = await getServerSession(req, res, authOptions);
			const userId = session?.user ? (session.user as any).id : undefined;
			const updatedTask = await taskService.updateTask(id, req.body, userId);
			if (!updatedTask) {
				return res.status(404).json({ message: "Task not found" });
			}
			return res.status(200).json(updatedTask);
		}

		if (req.method === "DELETE") {
			const deleted = await taskService.deleteTask(id);
			if (!deleted) {
				return res.status(404).json({ message: "Task not found" });
			}
			return res.status(204).end();
		}

		if (req.method === "POST" && req.query.action === "duplicate") {
			const duplicatedTask = await taskService.duplicateTask(id);
			if (!duplicatedTask) {
				return res.status(404).json({ message: "Task not found" });
			}
			return res.status(201).json(duplicatedTask);
		}

		return res.status(405).json({ message: "Method not allowed" });
	} catch (error: any) {
		console.error("Error managing task:", error);
		if (
			error?.message === "Add the member to the project and then assign task"
		) {
			return res.status(400).json({ message: error.message });
		}
		return res
			.status(500)
			.json({ message: error?.message || "Internal server error" });
	}
}
