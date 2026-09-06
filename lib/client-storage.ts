import type { Activity, Project, Task, User } from "../server/types";

const STORAGE_KEYS = {
	PROJECTS: "taskboard_local_projects",
	TASKS: "taskboard_local_tasks",
	USERS: "taskboard_local_users",
	ACTIVITIES: "taskboard_local_activities",
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
	// ==================== PROJECTS ====================
	getProjects(): Project[] {
		return getItem<Project[]>(STORAGE_KEYS.PROJECTS, []);
	},

	getProjectById(id: string): Project | undefined {
		const projects = this.getProjects();
		return projects.find((p) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()));
	},

	saveProject(project: Project): Project {
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
		const projects = this.getProjects();
		const filtered = projects.filter((p) => p.id !== id);
		setItem(STORAGE_KEYS.PROJECTS, filtered);
		// Clean up tasks for this project
		const tasks = this.getTasks();
		setItem(STORAGE_KEYS.TASKS, tasks.filter((t) => t.projectId !== id));
		return true;
	},

	mergeProjects(serverProjects: Project[]): Project[] {
		const localProjects = this.getProjects();
		const mergedMap = new Map<string, Project>();

		// Add server projects first
		for (const p of serverProjects) {
			mergedMap.set(p.id, p);
		}

		// Overlay local projects (which might contain newer creations / updates)
		for (const p of localProjects) {
			const existing = mergedMap.get(p.id);
			if (!existing) {
				mergedMap.set(p.id, p);
			} else {
				// Keep whichever was updated more recently
				const localTime = new Date(p.updatedAt || p.createdAt).getTime();
				const serverTime = new Date(existing.updatedAt || existing.createdAt).getTime();
				if (localTime >= serverTime) {
					mergedMap.set(p.id, { ...existing, ...p });
				}
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
		if (projectId) {
			return all.filter((t) => t.projectId === projectId);
		}
		return all;
	},

	getTaskById(id: string): Task | undefined {
		const tasks = this.getTasks();
		return tasks.find((t) => t.id === id);
	},

	saveTask(task: Task): Task {
		const tasks = this.getTasks();
		const index = tasks.findIndex((t) => t.id === task.id);
		if (index >= 0) {
			tasks[index] = { ...tasks[index], ...task, updatedAt: new Date().toISOString() };
		} else {
			tasks.unshift(task);
		}
		setItem(STORAGE_KEYS.TASKS, tasks);
		return task;
	},

	updateTask(id: string, updates: Partial<Task>): Task | undefined {
		const tasks = this.getTasks();
		const index = tasks.findIndex((t) => t.id === id);
		if (index === -1) return undefined;
		tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
		setItem(STORAGE_KEYS.TASKS, tasks);
		return tasks[index];
	},

	deleteTask(id: string): boolean {
		const tasks = this.getTasks();
		const filtered = tasks.filter((t) => t.id !== id);
		setItem(STORAGE_KEYS.TASKS, filtered);
		return true;
	},

	mergeTasks(serverTasks: Task[], projectId?: string): Task[] {
		const localTasks = this.getTasks();
		const mergedMap = new Map<string, Task>();

		for (const t of serverTasks) {
			mergedMap.set(t.id, t);
		}

		for (const t of localTasks) {
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
		const otherTasks = projectId ? localTasks.filter((t) => t.projectId !== projectId) : [];
		setItem(STORAGE_KEYS.TASKS, [...otherTasks, ...mergedList]);

		return projectId ? mergedList.filter((t) => t.projectId === projectId) : mergedList;
	},

	// ==================== USERS ====================
	getUsers(): User[] {
		const raw = getItem<any[]>(STORAGE_KEYS.USERS, []);
		const sanitized: User[] = [];
		let needsClean = false;

		for (const item of raw) {
			if (!item) {
				needsClean = true;
				continue;
			}
			const actual: any = item.user ? item.user : item;
			if (actual && actual.id) {
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
		const users = this.getUsers();
		const index = users.findIndex((u) => u.id === actual.id);
		if (index >= 0) {
			users[index] = { ...users[index], ...actual };
		} else {
			users.push(actual);
		}
		setItem(STORAGE_KEYS.USERS, users);
		return actual;
	},

	deleteUser(id: string): boolean {
		const users = this.getUsers();
		const filtered = users.filter((u) => u.id !== id);
		setItem(STORAGE_KEYS.USERS, filtered);

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
		const userMap = new Map<string, User>();
		for (const raw of serverUsers) {
			const u: any = raw.user ? raw.user : raw;
			if (!u || !u.id) continue;
			if (!u.name) {
				u.name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Member";
			}
			userMap.set(u.id, u);
		}
		for (const u of localUsers) {
			if (u && u.id && !userMap.has(u.id)) {
				userMap.set(u.id, u);
			}
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
