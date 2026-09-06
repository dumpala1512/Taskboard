import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { projectRepository } from "../../../../server/repositories/project.repository";
import { userRepository } from "../../../../server/repositories/user.repository";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const session = await getServerSession(req, res, authOptions);

	if (!session || !session.user || (session.user as any).role !== "ADMIN") {
		return res.status(403).json({ message: "Forbidden: Admins only" });
	}

	const { id: userId } = req.query;

	if (!userId || typeof userId !== "string") {
		return res.status(400).json({ message: "Invalid user ID" });
	}

	let user = await userRepository.findById(userId);
	if (!user) {
		user = await userRepository.findByEmail(userId);
	}
	if (!user) {
		return res.status(404).json({ message: "User not found" });
	}

	if (req.method === "POST") {
		// Assign projects
		try {
			const { projectIds } = req.body;
			if (!Array.isArray(projectIds)) {
				return res.status(400).json({ message: "projectIds must be an array" });
			}

			const allProjects = await projectRepository.findAll();
			let updatedCount = 0;

			for (const projectId of projectIds) {
				const project = allProjects.find((p) => p.id === projectId);
				if (project) {
					const members = project.members || [];
					const hasMember = members.includes(user.id) || (user.email && members.includes(user.email));
					if (!hasMember) {
						await projectRepository.update(projectId, {
							members: [...members, user.id],
						});
						updatedCount++;
					}
				}
			}

			// Maintain lightweight assignedProjectIds on user object without altering auth fields
			const currentAssigned = user.assignedProjectIds || [];
			const updatedAssigned = Array.from(
				new Set([...currentAssigned, ...projectIds]),
			);
			await userRepository.update(user.id, {
				assignedProjectIds: updatedAssigned,
			});

			return res
				.status(200)
				.json({ message: `Successfully assigned to ${updatedCount} projects` });
		} catch (error) {
			console.error("Error assigning projects:", error);
			return res.status(500).json({ message: "Internal server error" });
		}
	} else if (req.method === "DELETE") {
		// Unassign project
		try {
			const { projectId, taskAction } = req.body;
			if (!projectId) {
				return res.status(400).json({ message: "projectId is required" });
			}

			const project = await projectRepository.findById(projectId);
			if (!project) {
				return res.status(404).json({ message: "Project not found" });
			}

			const members = project.members || [];
			if (members.includes(userId)) {
				await projectRepository.update(projectId, {
					members: members.filter((m) => m !== userId),
				});
			}

			// Handle tasks if specified
			if (taskAction === "unassign") {
				const tasks = await import(
					"../../../../server/repositories/task.repository"
				).then((m) => m.taskRepository.findAll());
				const userTasks = tasks.filter(
					(t) =>
						t.projectId === projectId &&
						(t.assigneeId === userId || t.assignees?.includes(userId)),
				);

				for (const task of userTasks) {
					await import("../../../../server/repositories/task.repository").then(
						(m) =>
							m.taskRepository.update(task.id, {
								assigneeId:
									task.assigneeId === userId ? undefined : task.assigneeId,
								assignees: task.assignees?.filter((a) => a !== userId) || [],
							}),
					);
				}
			}

			// Update user's assignedProjectIds without altering auth fields
			const currentAssigned = user.assignedProjectIds || [];
			const updatedAssigned = currentAssigned.filter(
				(pid: string) => pid !== projectId,
			);
			await userRepository.update(userId, {
				assignedProjectIds: updatedAssigned,
			});

			return res
				.status(200)
				.json({ message: "Successfully removed from project" });
		} catch (error) {
			console.error("Error unassigning project:", error);
			return res.status(500).json({ message: "Internal server error" });
		}
	}

	return res.status(405).json({ message: "Method not allowed" });
}
