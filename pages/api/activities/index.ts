import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { attachDeletedHeaders } from "../../../server/data";
import { userRepository } from "../../../server/repositories/user.repository";
import { activityService } from "../../../server/services/activity.service";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	attachDeletedHeaders(res);
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	const session = await getServerSession(req, res, authOptions);
	if (!session || !session.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const userId = (session.user as any).id;
		const userRole = (session.user as any).role;

		const projectId = req.query.projectId as string | undefined;

		const rawActivities = projectId
			? await activityService.getActivitiesByProjectId(projectId, 100)
			: await activityService.getRecentActivities(20, userId, userRole);

		// Enrich with user data for the frontend
		const users = await userRepository.findAll();
		const userMap = new Map(
			users.map((u) => [u.id, { name: u.name, avatar: u.avatar }]),
		);

		const enrichedActivities = rawActivities.map((act) => ({
			id: act.id,
			type: act.type,
			user: userMap.get(act.userId) || { name: "Unknown User" },
			target: act.details,
			details: act.details,
			fromStatus: act.fromStatus,
			toStatus: act.toStatus,
			taskTitle: act.taskTitle,
			timestamp: act.createdAt,
			createdAt: act.createdAt,
			projectId: act.projectId,
			taskId: act.taskId,
		}));

		return res.status(200).json(enrichedActivities);
	} catch (error) {
		console.error("Error fetching activities:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
