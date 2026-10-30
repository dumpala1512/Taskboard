import axios from "axios";
import { getSession } from "next-auth/react";

const BACKEND_URL =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/taskboard/api/v1";

export const apiClient = axios.create({
	baseURL: BACKEND_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

apiClient.interceptors.request.use(async (config) => {
	// 1. Route directly to FastAPI backend
	config.baseURL = BACKEND_URL;

	// 2. Attach JWT Bearer Token for real FastAPI protected endpoints
	if (typeof window !== "undefined") {
		let token = localStorage.getItem("taskboard_access_token");
		if (!token) {
			const session = await getSession();
			token = (session as any)?.accessToken;
			if (token) {
				try {
					localStorage.setItem("taskboard_access_token", token);
				} catch (_) {}
			}
		}

		if (token && !config.headers.Authorization) {
			config.headers.Authorization = `Bearer ${token}`;
		}
	}

	return config;
});
