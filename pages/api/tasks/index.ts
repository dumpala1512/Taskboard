import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const BACKEND_URL =
	process.env.INTERNAL_API_URL ||
	process.env.BACKEND_API_URL ||
	process.env.NEXT_PUBLIC_API_URL ||
	"http://localhost:8000/taskboard/api/v1";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "GET" && req.method !== "POST") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const session = await getServerSession(req, res, authOptions);
		const token = (session as any)?.accessToken;

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		} else if (req.headers.authorization) {
			headers.Authorization = req.headers.authorization;
		}

		if (req.method === "GET") {
			const response = await axios.get(`${BACKEND_URL}/tasks`, {
				params: req.query,
				headers,
			});
			return res.status(response.status).json(response.data);
		}

		if (req.method === "POST") {
			const response = await axios.post(`${BACKEND_URL}/tasks`, req.body, {
				headers,
			});
			return res.status(response.status).json(response.data);
		}
	} catch (error: any) {
		console.error("Error proxying /tasks to backend:", error?.message);
		const status = error.response?.status || 500;
		const data =
			error.response?.data || {
				message: error?.message || "Internal server error",
			};
		return res.status(status).json(data);
	}
}
