import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { analyticsService } from "../../../server/services/analytics.service";
import { UserRole } from "../../../server/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  const userId = (session?.user as any)?.id;
  const userEmail = session?.user?.email;
  if (!userId && !userEmail) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const effectiveUserId = userId || userEmail;
  const filter = (req.query.filter as string) || (req.body?.filter as string);
  const sessionRole = (session?.user as any)?.role || "MEMBER";
  // Non-admin members can ONLY see their own analytics
  const effectiveRole = sessionRole !== "ADMIN" ? "MEMBER" : (filter === "my" ? "MEMBER" : "ADMIN");

  try {
    const { localTasks, localProjects, localUsers, deletedProjectIds, deletedTaskIds } = req.body || {};

    const data = await analyticsService.getDashboardData(
      effectiveUserId,
      effectiveRole as UserRole,
      {
        tasks: Array.isArray(localTasks) ? localTasks : undefined,
        projects: Array.isArray(localProjects) ? localProjects : undefined,
        users: Array.isArray(localUsers) ? localUsers : undefined,
        deletedProjectIds: Array.isArray(deletedProjectIds) ? deletedProjectIds : undefined,
        deletedTaskIds: Array.isArray(deletedTaskIds) ? deletedTaskIds : undefined,
      }
    );
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
