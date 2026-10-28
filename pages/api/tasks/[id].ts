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
	const { id } = req.query;

	if (!id || typeof id !== "string") {
		return res.status(400).json({ message: "Invalid task ID" });
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
			const response = await axios.get(`${BACKEND_URL}/tasks/${id}`, {
				headers,
			});
			return res.status(response.status).json(response.data);
		}

		if (req.method === "PATCH") {
			const response = await axios.patch(
				`${BACKEND_URL}/tasks/${id}`,
				req.body,
				{ headers },
			);
			return res.status(response.status).json(response.data);
		}

		if (req.method === "DELETE") {
			const response = await axios.delete(`${BACKEND_URL}/tasks/${id}`, {
				headers,
			});
			return res.status(response.status).end();
		}

		return res.status(405).json({ message: "Method not allowed" });
	} catch (error: any) {
		console.error("Error proxying /tasks/[id] to backend:", error?.message);
		const status = error.response?.status || 500;
		const data =
			error.response?.data || {
				message: error?.message || "Internal server error",
			};
		return res.status(status).json(data);
	}
}
