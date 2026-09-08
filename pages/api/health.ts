import type { NextApiRequest, NextApiResponse } from "next";
import packageInfo from "../../package.json";
import { loadDb } from "../../server/data";

export interface HealthResponse {
	status: "healthy" | "unhealthy";
	appName: string;
	version: string;
	timestamp: string;
	uptime: number;
	environment: string;
	checks: {
		database: "healthy" | "unhealthy";
	};
}

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<HealthResponse | { message: string }>,
) {
	if (req.method !== "GET" && req.method !== "HEAD") {
		res.setHeader("Allow", ["GET", "HEAD"]);
		return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
	}

	let dbStatus: "healthy" | "unhealthy" = "healthy";
	try {
		loadDb();
	} catch (_error) {
		dbStatus = "unhealthy";
	}

	const isHealthy = dbStatus === "healthy";

	const responseData: HealthResponse = {
		status: isHealthy ? "healthy" : "unhealthy",
		appName: packageInfo.name || "Taskboard",
		version: packageInfo.version || "0.1.0",
		timestamp: new Date().toISOString(),
		uptime: Math.floor(process.uptime()),
		environment: process.env.NODE_ENV || "development",
		checks: {
			database: dbStatus,
		},
	};

	return res.status(isHealthy ? 200 : 503).json(responseData);
}
