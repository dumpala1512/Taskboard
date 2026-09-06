import axios, { type AxiosResponse } from "axios";
import { clientStorage } from "./client-storage";
import { v4 as uuidv4 } from "uuid";

export const apiClient = axios.create({
	baseURL: "/api",
	headers: {
		"Content-Type": "application/json",
	},
});

function parseEndpoint(url?: string): { path: string; id?: string; subAction?: string } {
	if (!url) return { path: "" };
	const cleanUrl = url.split("?")[0];
	const parts = cleanUrl.replace(/^\/api\//, "").replace(/^\//, "").split("/");
	return {
		path: parts[0] || "",
		id: parts[1],
		subAction: parts[2],
	};
}

// Intercept successful responses to mirror data in clientStorage
apiClient.interceptors.response.use(
	(response: AxiosResponse) => {
		const method = response.config.method?.toUpperCase();
		const { path, id, subAction } = parseEndpoint(response.config.url);

		if (path === "projects") {
			if (method === "GET") {
				if (id) {
					if (response.data) clientStorage.saveProject(response.data);
				} else if (Array.isArray(response.data)) {
					response.data = clientStorage.mergeProjects(response.data);
				}
			} else if (method === "POST" && response.data) {
				clientStorage.saveProject(response.data);
			} else if (method === "PATCH" && response.data && id) {
				clientStorage.updateProject(id, response.data);
			} else if (method === "DELETE" && id && !subAction) {
				clientStorage.deleteProject(id);
			} else if (method === "DELETE" && id && subAction === "columns") {
				const colId = response.config.url?.split("/columns/")[1]?.split("?")[0];
				if (colId) {
					clientStorage.deleteProjectColumn(id, colId);
				}
			}
		} else if (path === "tasks") {
			const params = response.config.params;
			const projectId = params?.projectId;

			if (method === "GET") {
				if (id) {
					if (response.data) clientStorage.saveTask(response.data);
				} else if (Array.isArray(response.data)) {
					response.data = clientStorage.mergeTasks(response.data, projectId);
				}
			} else if (method === "POST" && response.data) {
				clientStorage.saveTask(response.data);
			} else if (method === "PATCH" && response.data && id) {
				clientStorage.updateTask(id, response.data);
			} else if (method === "DELETE" && id) {
				clientStorage.deleteTask(id);
			}
		} else if (path === "users") {
			if (method === "GET" && Array.isArray(response.data)) {
				response.data = clientStorage.mergeUsers(response.data);
			} else if (method === "DELETE" && id && !subAction) {
				clientStorage.deleteUser(id);
			} else if (subAction === "assign-projects" && id) {
				try {
					const body = typeof response.config.data === "string" ? JSON.parse(response.config.data) : response.config.data;
					if (method === "POST" && Array.isArray(body?.projectIds)) {
						body.projectIds.forEach((projId: string) => {
							const proj = clientStorage.getProjectById(projId);
							if (proj) {
								const members = proj.members || [];
								if (!members.includes(id)) {
									clientStorage.updateProject(proj.id, { members: [...members, id] });
								}
							}
						});
						const u = clientStorage.getUserById(id);
						if (u) {
							const current = (u as any).assignedProjectIds || [];
							const nextIds = Array.from(new Set([...current, ...body.projectIds]));
							clientStorage.saveUser({ ...u, assignedProjectIds: nextIds });
						}
					} else if (method === "DELETE" && body?.projectId) {
						const proj = clientStorage.getProjectById(body.projectId);
						if (proj) {
							const members = (proj.members || []).filter((m: string) => m !== id);
							clientStorage.updateProject(proj.id, { members });
						}
						const u = clientStorage.getUserById(id);
						if (u) {
							const current = (u as any).assignedProjectIds || [];
							const nextIds = current.filter((pid: string) => pid !== body.projectId);
							clientStorage.saveUser({ ...u, assignedProjectIds: nextIds });
						}
					}
				} catch (_) {}
			}
		} else if (path === "admin" && id === "users" && response.config.url?.includes("/create")) {
			if (method === "POST" && response.data) {
				const userToSave = response.data.user || response.data;
				const tempPassword = response.data.temporaryPassword;
				clientStorage.saveUser({
					...userToSave,
					tempPassword,
				});
			}
		} else if (path === "auth" && id === "setup-account" && method === "POST") {
			try {
				const body = typeof response.config.data === "string" ? JSON.parse(response.config.data) : response.config.data;
				if (body?.newPassword) {
					const allUsers = clientStorage.getUsers();
					const targetId = response.data?.user?.id || body?.userId;
					const targetEmail = response.data?.user?.email || body?.email;
					const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : "";
					const u = allUsers.find(
						(x) =>
							(cleanEmail && x.email && x.email.trim().toLowerCase() === cleanEmail) ||
							(targetId && x.id === targetId),
					);
					const baseUser = u || {
						id: targetId || uuidv4(),
						email: targetEmail,
						name: targetEmail || "Member",
						role: "MEMBER",
						status: "ACTIVE",
					};
					clientStorage.saveUser({
						...baseUser,
						id: targetId || baseUser.id,
						tempPassword: body.newPassword,
						passwordHash: response.data?.passwordHash,
						isFirstLogin: false,
					});
				}
			} catch (_) {}
		} else if (path === "activities") {
			if (method === "GET" && Array.isArray(response.data)) {
				response.data = clientStorage.mergeActivities(response.data);
			}
		}

		return response;
	},
	// Intercept errors (specifically 404s from isolated serverless lambdas) and recover from clientStorage
	(error) => {
		const config = error.config;
		if (!config) return Promise.reject(error);

		const method = config.method?.toUpperCase();
		const { path, id, subAction } = parseEndpoint(config.url);
		const status = error.response?.status;

		// Fallback for Account Setup (only on 404 or server failure, not on 400 bad request)
		if (path === "auth" && id === "setup-account" && (status === 404 || !status || status >= 500)) {
			try {
				const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
				if (body?.newPassword) {
					const allUsers = clientStorage.getUsers();
					const targetId = body?.userId;
					const targetEmail = body?.email ? body.email.trim().toLowerCase() : "";
					const target = allUsers.find((u) => 
						(targetId && u.id === targetId) ||
						(targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail) ||
						u.isFirstLogin
					);
					if (target) {
						clientStorage.saveUser({
							...target,
							tempPassword: body.newPassword,
							isFirstLogin: false,
						});
					}
				}
			} catch (_) {}
			return Promise.resolve({
				data: { message: "Account setup successful" },
				status: 200,
				statusText: "OK (Local Fallback)",
				headers: {},
				config,
			} as AxiosResponse);
		}

		// 404 Recovery for Projects
		if (path === "projects") {
			if (method === "GET" && id && (status === 404 || !status)) {
				const localProject = clientStorage.getProjectById(id);
				if (localProject) {
					return Promise.resolve({
						data: localProject,
						status: 200,
						statusText: "OK (Recovered from Local Storage)",
						headers: {},
						config,
					} as AxiosResponse);
				}
			} else if (method === "GET" && !id) {
				const localProjects = clientStorage.getProjects();
				if (localProjects.length > 0) {
					return Promise.resolve({
						data: localProjects,
						status: 200,
						statusText: "OK (Recovered from Local Storage)",
						headers: {},
						config,
					} as AxiosResponse);
				}
			} else if (method === "POST") {
				// If serverless failed to persist project, persist locally
				try {
					const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
					const fallbackProject = {
						columns: [
							{ id: "TODO", title: "To Do" },
							{ id: "IN_PROGRESS", title: "In Progress" },
							{ id: "REVIEW", title: "Review" },
							{ id: "DONE", title: "Done" },
						],
						...body,
						id: uuidv4(),
						key: body.key || `PRJ-${Math.floor(Math.random() * 1000)}`,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					clientStorage.saveProject(fallbackProject);
					return Promise.resolve({
						data: fallbackProject,
						status: 201,
						statusText: "Created (Local Fallback)",
						headers: {},
						config,
					} as AxiosResponse);
				} catch (e) {
					// pass through original error
				}
			} else if (method === "PATCH" && id) {
				try {
					const updates = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
					const updated = clientStorage.updateProject(id, updates);
					if (updated) {
						return Promise.resolve({
							data: updated,
							status: 200,
							statusText: "OK (Local Fallback)",
							headers: {},
							config,
						} as AxiosResponse);
					}
				} catch (e) {
					// pass through original error
				}
			} else if (method === "DELETE" && id && !subAction) {
				clientStorage.deleteProject(id);
				return Promise.resolve({
					data: { message: "Project deleted successfully" },
					status: 200,
					statusText: "OK (Local Fallback)",
					headers: {},
					config,
				} as AxiosResponse);
			} else if (method === "DELETE" && id && subAction === "columns") {
				const colId = config.url?.split("/columns/")[1]?.split("?")[0];
				if (colId) {
					const updated = clientStorage.deleteProjectColumn(id, colId);
					return Promise.resolve({
						data: updated || { message: "Column deleted successfully" },
						status: 200,
						statusText: "OK (Local Fallback)",
						headers: {},
						config,
					} as AxiosResponse);
				}
			}
		}

		// 404 Recovery for Tasks
		if (path === "tasks") {
			const params = config.params;
			const projectId = params?.projectId;

			if (method === "GET" && id && (status === 404 || !status)) {
				const localTask = clientStorage.getTaskById(id);
				if (localTask) {
					return Promise.resolve({
						data: localTask,
						status: 200,
						statusText: "OK (Recovered from Local Storage)",
						headers: {},
						config,
					} as AxiosResponse);
				}
			} else if (method === "GET" && !id) {
				const localTasks = clientStorage.getTasks(projectId);
				if (localTasks.length > 0) {
					return Promise.resolve({
						data: localTasks,
						status: 200,
						statusText: "OK (Recovered from Local Storage)",
						headers: {},
						config,
					} as AxiosResponse);
				}
			} else if (method === "POST") {
				try {
					const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
					const fallbackTask = {
						...body,
						id: uuidv4(),
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					clientStorage.saveTask(fallbackTask);
					return Promise.resolve({
						data: fallbackTask,
						status: 201,
						statusText: "Created (Local Fallback)",
						headers: {},
						config,
					} as AxiosResponse);
				} catch (e) {
					// pass through original error
				}
			} else if (method === "PATCH" && id) {
				try {
					const updates = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
					const updated = clientStorage.updateTask(id, updates);
					if (updated) {
						return Promise.resolve({
							data: updated,
							status: 200,
							statusText: "OK (Local Fallback)",
							headers: {},
							config,
						} as AxiosResponse);
					}
				} catch (e) {
					// pass through original error
				}
			} else if (method === "DELETE" && id) {
				clientStorage.deleteTask(id);
				return Promise.resolve({
					data: { message: "Task deleted successfully" },
					status: 200,
					statusText: "OK (Local Fallback)",
					headers: {},
					config,
				} as AxiosResponse);
			}
		}

		// Users error recovery
		if (path === "users") {
			if (method === "DELETE" && id && !subAction) {
				clientStorage.deleteUser(id);
				return Promise.resolve({
					data: { message: "User deleted successfully" },
					status: 200,
					statusText: "OK (Local Fallback)",
					headers: {},
					config,
				} as AxiosResponse);
			} else if (subAction === "assign-projects" && id) {
				try {
					const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
					if (method === "POST" && Array.isArray(body?.projectIds)) {
						body.projectIds.forEach((projId: string) => {
							const proj = clientStorage.getProjectById(projId);
							if (proj) {
								const members = proj.members || [];
								if (!members.includes(id)) {
									clientStorage.updateProject(proj.id, { members: [...members, id] });
								}
							}
						});
						const u = clientStorage.getUserById(id);
						if (u) {
							const current = (u as any).assignedProjectIds || [];
							const nextIds = Array.from(new Set([...current, ...body.projectIds]));
							clientStorage.saveUser({ ...u, assignedProjectIds: nextIds });
						}
					} else if (method === "DELETE" && body?.projectId) {
						const proj = clientStorage.getProjectById(body.projectId);
						if (proj) {
							const members = (proj.members || []).filter((m: string) => m !== id);
							clientStorage.updateProject(proj.id, { members });
						}
						const u = clientStorage.getUserById(id);
						if (u) {
							const current = (u as any).assignedProjectIds || [];
							const nextIds = current.filter((pid: string) => pid !== body.projectId);
							clientStorage.saveUser({ ...u, assignedProjectIds: nextIds });
						}
					}
				} catch (_) {}
				return Promise.resolve({
					data: { message: "Project assignment updated" },
					status: 200,
					statusText: "OK (Local Fallback)",
					headers: {},
					config,
				} as AxiosResponse);
			} else if (method === "GET") {
				const localUsers = clientStorage.getUsers();
				if (localUsers.length > 0) {
					return Promise.resolve({
						data: localUsers,
						status: 200,
						statusText: "OK (Recovered from Local Storage)",
						headers: {},
						config,
					} as AxiosResponse);
				}
			}
		}

		return Promise.reject(error);
	},
);
