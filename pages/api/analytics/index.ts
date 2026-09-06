import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { analyticsService } from "../../../server/services/analytics.service";
import { UserRole } from "../../../server/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  const userId = (session?.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const filter = req.query.filter as string;
  const effectiveRole = filter === 'my' ? 'MEMBER' : 'ADMIN';

  try {
    const data = await analyticsService.getDashboardData(
      userId,
      effectiveRole as UserRole
    );
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
