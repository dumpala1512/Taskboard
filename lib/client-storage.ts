import type { Activity, Project, Task, User } from "../server/types";

const STORAGE_KEYS = {
	PROJECTS: "taskboard_local_projects",
	TASKS: "taskboard_local_tasks",
	USERS: "taskboard_local_users",
	ACTIVITIES: "taskboard_local_activities",
	DELETED_USERS: "taskboard_deleted_users",
	DELETED_PROJECTS: "taskboard_deleted_projects",
	DELETED_TASKS: "taskboard_deleted_tasks",
};

function isClient(): boolean {
	return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getItem<T>(key: string, defaultValue: T): T {
	if (!isClient()) return defaultValue;
	try {
		const item = window.localStorage.getItem(key);
		return item ? JSON.parse(item) : defaultValue;
	} catch (e) {
		console.warn(`[ClientStorage] Error reading ${key}`, e);
		return defaultValue;
	}
}

function setItem<T>(key: string, value: T): void {
	if (!isClient()) return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.warn(`[ClientStorage] Error saving ${key}`, e);
	}
}

export const clientStorage = {
	// ==================== DELETED / TOMBSTONES ====================
	getDeletedUserIds(): string[] {
		return getItem<string[]>(STORAGE_KEYS.DELETED_USERS, []);
	},

	getDeletedProjectIds(): string[] {
		return getItem<string[]>(STORAGE_KEYS.DELETED_PROJECTS, []);
	},

	getDeletedTaskIds(): string[] {
		return getItem<string[]>(STORAGE_KEYS.DELETED_TASKS, []);
	},

	// ==================== PROJECTS ====================
	getProjects(): Project[] {
		const raw = getItem<Project[]>(STORAGE_KEYS.PROJECTS, []);
		const deletedIds = new Set(this.getDeletedProjectIds());
		return raw.filter((p) => p && p.id && !deletedIds.has(p.id) && (!p.key || !deletedIds.has(p.key.toLowerCase())));
	},

	getProjectById(id: string): Project | undefined {
		const projects = this.getProjects();
		return projects.find((p) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()));
	},

	saveProject(project: Project): Project {
		const deleted = this.getDeletedProjectIds();
		if (deleted.includes(project.id) || (project.key && deleted.includes(project.key.toLowerCase()))) {
			setItem(
				STORAGE_KEYS.DELETED_PROJECTS,
				deleted.filter((id) => id !== project.id && id !== project.key?.toLowerCase()),
			);
		}
		const projects = this.getProjects();
		const index = projects.findIndex((p) => p.id === project.id);
		if (index >= 0) {
			projects[index] = { ...projects[index], ...project, updatedAt: new Date().toISOString() };
		} else {
			projects.unshift(project);
		}
		setItem(STORAGE_KEYS.PROJECTS, projects);
		return project;
	},

	updateProject(id: string, updates: Partial<Project>): Project | undefined {
		const projects = this.getProjects();
		const index = projects.findIndex((p) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()));
		if (index === -1) return undefined;
		projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
		setItem(STORAGE_KEYS.PROJECTS, projects);
		return projects[index];
	},

	deleteProject(id: string): boolean {
		const deleted = this.getDeletedProjectIds();
		const targetId = id.toLowerCase();
		if (!deleted.includes(targetId)) {
			deleted.push(targetId);
			setItem(STORAGE_KEYS.DELETED_PROJECTS, deleted);
		}
		const projects = this.getProjects();
		const filtered = projects.filter((p) => p.id !== id && p.key?.toLowerCase() !== targetId);
		setItem(STORAGE_KEYS.PROJECTS, filtered);
		// Clean up tasks for this project
		const tasks = this.getTasks();
		setItem(STORAGE_KEYS.TASKS, tasks.filter((t) => t.projectId !== id));
		return true;
	},

	deleteProjectColumn(projectId: string, columnId: string): Project | undefined {
		const project = this.getProjectById(projectId);
		if (!project) return undefined;
		const defaultCols = [
			{ id: "TODO", title: "To Do" },
			{ id: "IN_PROGRESS", title: "In Progress" },
			{ id: "REVIEW", title: "Review" },
			{ id: "DONE", title: "Done" },
		];
		const currentCols = project.columns && project.columns.length > 0 ? project.columns : defaultCols;
		const updatedCols = currentCols.filter(
			(c) => c.id.toLowerCase() !== columnId.toLowerCase(),
		);
		const updatedProj = this.updateProject(project.id, { columns: updatedCols });

		// Move any tasks in this column to BACKLOG
		const allTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
		let modified = false;
		const nextTasks = allTasks.map((t) => {
			if (
				(t.projectId === project.id || (project.key && t.projectId === project.key)) &&
				t.status?.toLowerCase() === columnId.toLowerCase()
			) {
				modified = true;
				return { ...t, status: "BACKLOG" as any, updatedAt: new Date().toISOString() };
			}
			return t;
		});
		if (modified) {
			setItem(STORAGE_KEYS.TASKS, nextTasks);
		}
		return updatedProj;
	},

	mergeProjects(serverProjects: Project[]): Project[] {
		const localProjects = this.getProjects();
		const deletedIds = new Set(this.getDeletedProjectIds());
		const mergedMap = new Map<string, Project>();

		// Add server projects first (ignoring deleted)
		for (const p of serverProjects) {
			if (!p || !p.id) continue;
			if (deletedIds.has(p.id) || (p.key && deletedIds.has(p.key.toLowerCase()))) continue;
			mergedMap.set(p.id, p);
		}

		// Overlay local projects
		for (const p of localProjects) {
			if (!p || !p.id) continue;
			if (deletedIds.has(p.id) || (p.key && deletedIds.has(p.key.toLowerCase()))) continue;
			const existing = mergedMap.get(p.id);
			if (!existing) {
				mergedMap.set(p.id, p);
			} else {
				const mergedMembers = Array.from(
					new Set([...(existing.members || []), ...(p.members || [])]),
				);
				const localTime = new Date(p.updatedAt || p.createdAt).getTime();
				const serverTime = new Date(existing.updatedAt || existing.createdAt).getTime();
				const base = localTime >= serverTime ? { ...existing, ...p } : { ...p, ...existing };
				mergedMap.set(p.id, {
					...base,
					members: mergedMembers,
				});
			}
		}

		const mergedList = Array.from(mergedMap.values()).sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		setItem(STORAGE_KEYS.PROJECTS, mergedList);
		return mergedList;
	},

	// ==================== TASKS ====================
	getTasks(projectId?: string): Task[] {
		const all = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
		const deletedIds = new Set(this.getDeletedTaskIds());
		const active = all.filter((t) => t && t.id && !deletedIds.has(t.id));
		if (projectId) {
			return active.filter((t) => t.projectId === projectId);
		}
		return active;
	},

	getTaskById(id: string): Task | undefined {
		const tasks = this.getTasks();
		return tasks.find((t) => t.id === id);
	},

	saveTask(task: Task): Task {
		const deleted = this.getDeletedTaskIds();
		if (deleted.includes(task.id)) {
			setItem(
				STORAGE_KEYS.DELETED_TASKS,
				deleted.filter((id) => id !== task.id),
			);
		}
		const tasks = this.getTasks();
		const index = tasks.findIndex((t) => t.id === task.id);
		const now = new Date().toISOString();
		const isDone = (task.status || "").toUpperCase() === "DONE" || (task.status || "").toUpperCase() === "COMPLETED";
		const completedAt = isDone ? (task as any).completedAt || now : undefined;
		const taskToSave: Task = {
			...task,
			createdAt: task.createdAt || now,
			updatedAt: task.updatedAt || now,
			...(completedAt ? { completedAt } as any : {}),
		};

		if (index >= 0) {
			tasks[index] = { ...tasks[index], ...taskToSave };
		} else {
			tasks.unshift(taskToSave);
		}
		setItem(STORAGE_KEYS.TASKS, tasks);
		return tasks[index >= 0 ? index : 0];
	},

	updateTask(id: string, updates: Partial<Task>): Task | undefined {
		const tasks = this.getTasks();
		const index = tasks.findIndex((t) => t.id === id);
		if (index === -1) return undefined;
		const now = new Date().toISOString();
		const isDone = (updates.status || "").toUpperCase() === "DONE" || (updates.status || "").toUpperCase() === "COMPLETED";
		const completedAt = isDone
			? (updates as any).completedAt || (tasks[index] as any).completedAt || now
			: undefined;

		tasks[index] = {
			...tasks[index],
			...updates,
			updatedAt: updates.updatedAt || now,
			...(completedAt ? { completedAt } as any : {}),
		};
		setItem(STORAGE_KEYS.TASKS, tasks);
		return tasks[index];
	},

	deleteTask(id: string): boolean {
		const deleted = this.getDeletedTaskIds();
		if (!deleted.includes(id)) {
			deleted.push(id);
			setItem(STORAGE_KEYS.DELETED_TASKS, deleted);
		}
		const tasks = this.getTasks();
		const filtered = tasks.filter((t) => t.id !== id);
		setItem(STORAGE_KEYS.TASKS, filtered);
		return true;
	},

	mergeTasks(serverTasks: Task[], projectId?: string): Task[] {
		const localTasks = this.getTasks();
		const deletedIds = new Set(this.getDeletedTaskIds());
		const mergedMap = new Map<string, Task>();

		for (const t of serverTasks) {
			if (!t || !t.id || deletedIds.has(t.id)) continue;
			mergedMap.set(t.id, t);
		}

		for (const t of localTasks) {
			if (!t || !t.id || deletedIds.has(t.id)) continue;
			if (projectId && t.projectId !== projectId) continue;
			const existing = mergedMap.get(t.id);
			if (!existing) {
				mergedMap.set(t.id, t);
			} else {
				const localTime = new Date(t.updatedAt || t.createdAt).getTime();
				const serverTime = new Date(existing.updatedAt || existing.createdAt).getTime();
				if (localTime >= serverTime) {
					mergedMap.set(t.id, { ...existing, ...t });
				}
			}
		}

		const mergedList = Array.from(mergedMap.values());
		const otherTasks = projectId ? localTasks.filter((t) => t.projectId !== projectId && !deletedIds.has(t.id)) : [];
		setItem(STORAGE_KEYS.TASKS, [...otherTasks, ...mergedList]);

		return projectId ? mergedList.filter((t) => t.projectId === projectId) : mergedList;
	},

	// ==================== USERS ====================
	getUsers(): User[] {
		const raw = getItem<any[]>(STORAGE_KEYS.USERS, []);
		const deletedIds = new Set(this.getDeletedUserIds());
		const sanitized: User[] = [];
		const seenEmails = new Set<string>();
		const seenIds = new Set<string>();
		let needsClean = false;

		for (const item of raw) {
			if (!item) {
				needsClean = true;
				continue;
			}
			const actual: any = item.user ? item.user : item;
			if (actual && actual.id) {
				const cleanEmail = actual.email ? actual.email.trim().toLowerCase() : "";
				if (deletedIds.has(actual.id) || (cleanEmail && deletedIds.has(cleanEmail))) {
					needsClean = true;
					continue;
				}
				// Deduplicate by both ID and Email
				if (seenIds.has(actual.id) || (cleanEmail && seenEmails.has(cleanEmail))) {
					needsClean = true;
					continue;
				}
				seenIds.add(actual.id);
				if (cleanEmail) seenEmails.add(cleanEmail);

				const name = actual.name || `${actual.firstName || ""} ${actual.lastName || ""}`.trim() || actual.email || "Member";
				sanitized.push({
					...actual,
					name,
				});
				if (item.user) needsClean = true;
			} else {
				needsClean = true;
			}
		}

		if (needsClean) {
			setItem(STORAGE_KEYS.USERS, sanitized);
		}

		return sanitized;
	},

	getUserById(id: string): User | undefined {
		return this.getUsers().find((u) => u.id === id);
	},

	saveUser(user: any): User {
		const actual: any = user.user ? user.user : user;
		if (!actual || !actual.id) return actual;
		if (!actual.name) {
			actual.name = `${actual.firstName || ""} ${actual.lastName || ""}`.trim() || actual.email || "Member";
		}
		const deleted = this.getDeletedUserIds();
		const cleanActualEmail = actual.email ? actual.email.trim().toLowerCase() : "";
		if (deleted.includes(actual.id)) {
			setItem(
				STORAGE_KEYS.DELETED_USERS,
				deleted.filter((id) => id !== actual.id && id !== cleanActualEmail),
			);
		}
		if (cleanActualEmail && deleted.includes(cleanActualEmail)) {
			setItem(
				STORAGE_KEYS.DELETED_USERS,
				deleted.filter((id) => id !== actual.id && id !== cleanActualEmail),
			);
		}

		const users = this.getUsers();
		const index = users.findIndex(
			(u) =>
				u.id === actual.id ||
				(cleanActualEmail && u.email && u.email.trim().toLowerCase() === cleanActualEmail),
		);

		let savedUser: User;
		if (index >= 0) {
			const existing = users[index] as any;
			const isFirstLogin = typeof actual.isFirstLogin !== "undefined" ? actual.isFirstLogin : existing.isFirstLogin;
			savedUser = {
				...existing,
				...actual,
				id: actual.id || existing.id,
				isFirstLogin,
				tempPassword: actual.tempPassword ?? (isFirstLogin === false ? undefined : existing.tempPassword),
				passwordHash: actual.passwordHash || existing.passwordHash,
			};
			users[index] = savedUser;
			// Filter out any other duplicate entries with the same email or ID
			const deduplicated = users.filter((u, i) => {
				if (i === index) return true;
				const uEmail = u.email?.trim().toLowerCase();
				return !(cleanActualEmail && uEmail === cleanActualEmail) && u.id !== savedUser.id;
			});
			setItem(STORAGE_KEYS.USERS, deduplicated);
		} else {
			savedUser = actual;
			users.push(savedUser);
			setItem(STORAGE_KEYS.USERS, users);
		}
		return savedUser;
	},

	deleteUser(id: string): boolean {
		const deleted = this.getDeletedUserIds();
		if (!deleted.includes(id)) {
			deleted.push(id);
			setItem(STORAGE_KEYS.DELETED_USERS, deleted);
		}

		const users = this.getUsers().filter((u) => u.id !== id && u.email !== id);
		setItem(STORAGE_KEYS.USERS, users);

		// Also remove deleted user from local projects' member lists
		const projects = this.getProjects();
		const updatedProjects = projects.map((p) => {
			if (p.members && p.members.includes(id)) {
				return { ...p, members: p.members.filter((m) => m !== id) };
			}
			return p;
		});
		setItem(STORAGE_KEYS.PROJECTS, updatedProjects);

		return true;
	},

	mergeUsers(serverUsers: any[]): User[] {
		const localUsers = this.getUsers();
		const deletedIds = new Set(this.getDeletedUserIds());
		const localMap = new Map<string, any>();
		const localEmailMap = new Map<string, any>();
		for (const u of localUsers) {
			if (u && u.id) localMap.set(u.id, u);
			if (u && u.email) localEmailMap.set(u.email.trim().toLowerCase(), u);
		}

		const userMap = new Map<string, User>();
		const seenEmails = new Set<string>();

		for (const raw of serverUsers) {
			const u: any = raw.user ? raw.user : raw;
			if (!u || !u.id || deletedIds.has(u.id)) continue;
			const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
			if (cleanEmail && deletedIds.has(cleanEmail)) continue;

			if (!u.name) {
				u.name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Member";
			}
			const existing =
				localMap.get(u.id) ||
				(cleanEmail ? localEmailMap.get(cleanEmail) : undefined);
			const isFirstLogin = (existing?.isFirstLogin === false || u.isFirstLogin === false)
				? false
				: (typeof u.isFirstLogin !== "undefined" ? u.isFirstLogin : existing?.isFirstLogin);

			const merged = {
				...existing,
				...u,
				isFirstLogin,
				tempPassword: isFirstLogin === false ? undefined : (u.tempPassword || existing?.tempPassword),
				passwordHash: u.passwordHash || existing?.passwordHash,
			};

			userMap.set(u.id, merged);
			if (cleanEmail) seenEmails.add(cleanEmail);
		}

		for (const u of localUsers) {
			if (!u || !u.id || deletedIds.has(u.id)) continue;
			const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
			if (cleanEmail && deletedIds.has(cleanEmail)) continue;

			// Do not re-add if user with this ID or email was already processed from serverUsers
			if (userMap.has(u.id) || (cleanEmail && seenEmails.has(cleanEmail))) {
				continue;
			}
			userMap.set(u.id, u);
			if (cleanEmail) seenEmails.add(cleanEmail);
		}

		const list = Array.from(userMap.values());
		setItem(STORAGE_KEYS.USERS, list);
		return list;
	},

	// ==================== ACTIVITIES ====================
	getActivities(): Activity[] {
		return getItem<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
	},

	addActivity(activity: Activity): void {
		const activities = this.getActivities();
		activities.unshift(activity);
		setItem(STORAGE_KEYS.ACTIVITIES, activities.slice(0, 100));
	},

	mergeActivities(serverActivities: Activity[]): Activity[] {
		const localActivities = this.getActivities();
		const actMap = new Map<string, Activity>();
		for (const a of serverActivities) {
			actMap.set(a.id, a);
		}
		for (const a of localActivities) {
			if (!actMap.has(a.id)) {
				actMap.set(a.id, a);
			}
		}
		const list = Array.from(actMap.values()).sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		setItem(STORAGE_KEYS.ACTIVITIES, list);
		return list;
	},
};
