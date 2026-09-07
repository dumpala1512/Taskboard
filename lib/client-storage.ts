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

	syncDeleted(data: {
		deletedProjectIds?: string[];
		deletedUserIds?: string[];
		deletedTaskIds?: string[];
	}): void {
		if (!data) return;
		let projectsChanged = false;
		let usersChanged = false;
		let tasksChanged = false;

		if (Array.isArray(data.deletedProjectIds) && data.deletedProjectIds.length > 0) {
			const existing = this.getDeletedProjectIds();
			const existingSet = new Set(existing.map((x) => x.toLowerCase()));
			for (const id of data.deletedProjectIds) {
				if (id && !existingSet.has(id.toLowerCase())) {
					existing.push(id);
					existing.push(id.toLowerCase());
					existingSet.add(id.toLowerCase());
					projectsChanged = true;
				}
			}
			if (projectsChanged) {
				setItem(STORAGE_KEYS.DELETED_PROJECTS, existing);
				const deletedSet = new Set(existing.map((x) => x.toLowerCase()));
				const filtered = getItem<Project[]>(STORAGE_KEYS.PROJECTS, []).filter(
					(p) => p && p.id && !deletedSet.has(p.id.toLowerCase()) && (!p.key || !deletedSet.has(p.key.toLowerCase())),
				);
				setItem(STORAGE_KEYS.PROJECTS, filtered);
			}
		}

		if (Array.isArray(data.deletedUserIds) && data.deletedUserIds.length > 0) {
			const existing = this.getDeletedUserIds();
			const existingSet = new Set(existing.map((x) => x.toLowerCase()));
			for (const id of data.deletedUserIds) {
				if (id && !existingSet.has(id.toLowerCase())) {
					existing.push(id);
					existing.push(id.toLowerCase());
					existingSet.add(id.toLowerCase());
					usersChanged = true;
				}
			}
			if (usersChanged) {
				setItem(STORAGE_KEYS.DELETED_USERS, existing);
				const deletedSet = new Set(existing.map((x) => x.toLowerCase()));
				const filteredUsers = getItem<any[]>(STORAGE_KEYS.USERS, []).filter((item) => {
					const u = item?.user || item;
					if (!u || !u.id) return false;
					if (deletedSet.has(u.id.toLowerCase())) return false;
					if (u.email && deletedSet.has(u.email.trim().toLowerCase())) return false;
					return true;
				});
				setItem(STORAGE_KEYS.USERS, filteredUsers);
			}
		}

		if (Array.isArray(data.deletedTaskIds) && data.deletedTaskIds.length > 0) {
			const existing = this.getDeletedTaskIds();
			const existingSet = new Set(existing.map((x) => x.toLowerCase()));
			for (const id of data.deletedTaskIds) {
				if (id && !existingSet.has(id.toLowerCase())) {
					existing.push(id);
					existing.push(id.toLowerCase());
					existingSet.add(id.toLowerCase());
					tasksChanged = true;
				}
			}
			if (tasksChanged) {
				setItem(STORAGE_KEYS.DELETED_TASKS, existing);
				const deletedSet = new Set(existing.map((x) => x.toLowerCase()));
				const filteredTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []).filter(
					(t) => t && t.id && !deletedSet.has(t.id.toLowerCase()),
				);
				setItem(STORAGE_KEYS.TASKS, filteredTasks);
			}
		}
	},

	// ==================== PROJECTS ====================
	getProjects(): Project[] {
		const raw = getItem<Project[]>(STORAGE_KEYS.PROJECTS, []);
		const deletedIds = new Set(this.getDeletedProjectIds().map((x) => x.toLowerCase()));
		return raw.filter((p) => {
			if (!p || !p.id) return false;
			if (deletedIds.has(p.id.toLowerCase())) return false;
			if (p.key && deletedIds.has(p.key.toLowerCase())) return false;
			return true;
		});
	},

	getProjectById(id: string): Project | undefined {
		const projects = this.getProjects();
		return projects.find((p) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase()));
	},

	saveProject(project: Project): Project {
		const deleted = this.getDeletedProjectIds();
		const targetId = project.id.toLowerCase();
		const targetKey = project.key?.toLowerCase();
		if (deleted.some((d) => d.toLowerCase() === targetId || (targetKey && d.toLowerCase() === targetKey))) {
			setItem(
				STORAGE_KEYS.DELETED_PROJECTS,
				deleted.filter((id) => id.toLowerCase() !== targetId && id.toLowerCase() !== targetKey),
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
		const projects = getItem<Project[]>(STORAGE_KEYS.PROJECTS, []);
		const targetProj = projects.find(
			(p) => p && (p.id === id || p.id?.toLowerCase() === targetId || p.key?.toLowerCase() === targetId),
		);

		const toAdd = new Set<string>([id, targetId]);
		if (targetProj) {
			if (targetProj.id) {
				toAdd.add(targetProj.id);
				toAdd.add(targetProj.id.toLowerCase());
			}
			if (targetProj.key) {
				toAdd.add(targetProj.key);
				toAdd.add(targetProj.key.toLowerCase());
			}
		}

		let changed = false;
		for (const item of toAdd) {
			if (!deleted.includes(item)) {
				deleted.push(item);
				changed = true;
			}
		}
		if (changed) {
			setItem(STORAGE_KEYS.DELETED_PROJECTS, deleted);
		}

		const deletedSet = new Set(deleted.map((d) => d.toLowerCase()));
		const filtered = projects.filter((p) => {
			if (!p || !p.id) return false;
			if (deletedSet.has(p.id.toLowerCase())) return false;
			if (p.key && deletedSet.has(p.key.toLowerCase())) return false;
			return true;
		});
		setItem(STORAGE_KEYS.PROJECTS, filtered);

		// Clean up tasks for this project
		const allTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
		const isProjectTask = (t: Task) =>
			t.projectId === id ||
			(t.projectId && t.projectId.toLowerCase() === targetId) ||
			(targetProj && (t.projectId === targetProj.id || (targetProj.key && t.projectId.toLowerCase() === targetProj.key.toLowerCase())));
		const tasksToDelete = allTasks.filter(isProjectTask);
		const remainingTasks = allTasks.filter((t) => !isProjectTask(t));
		setItem(STORAGE_KEYS.TASKS, remainingTasks);

		// Record deleted task IDs so they are not resurrected
		const deletedTaskIds = this.getDeletedTaskIds();
		const newDeletedTaskIds = Array.from(
			new Set([...deletedTaskIds, ...tasksToDelete.map((t) => t.id)]),
		);
		setItem(STORAGE_KEYS.DELETED_TASKS, newDeletedTaskIds);
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
		const deletedIds = new Set(this.getDeletedProjectIds().map((x) => x.toLowerCase()));
		const mergedMap = new Map<string, Project>();

		// 1. Add server projects (excluding deleted)
		for (const p of serverProjects || []) {
			if (!p || !p.id) continue;
			if (deletedIds.has(p.id.toLowerCase()) || (p.key && deletedIds.has(p.key.toLowerCase()))) continue;
			mergedMap.set(p.id, p);
		}

		// 2. Keep local projects that are NOT deleted (crucial for surviving serverless lambdas on refresh)
		for (const p of localProjects || []) {
			if (!p || !p.id) continue;
			if (deletedIds.has(p.id.toLowerCase()) || (p.key && deletedIds.has(p.key.toLowerCase()))) continue;
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
		const activeProjects = this.getProjects();
		const validProjectIds = new Set<string>();
		activeProjects.forEach((p) => {
			if (p.id) validProjectIds.add(p.id.toLowerCase());
			if (p.key) validProjectIds.add(p.key.toLowerCase());
		});
		const active = all.filter(
			(t) =>
				t &&
				t.id &&
				!deletedIds.has(t.id) &&
				t.projectId &&
				validProjectIds.has(t.projectId.toLowerCase()),
		);
		if (projectId) {
			const targetProj = activeProjects.find(
				(p) =>
					p.id === projectId ||
					p.id?.toLowerCase() === projectId.toLowerCase() ||
					(p.key && p.key.toLowerCase() === projectId.toLowerCase()),
			);
			const validForProj = new Set<string>([projectId.toLowerCase()]);
			if (targetProj?.id) validForProj.add(targetProj.id.toLowerCase());
			if (targetProj?.key) validForProj.add(targetProj.key.toLowerCase());
			return active.filter((t) => t.projectId && validForProj.has(t.projectId.toLowerCase()));
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
		const activeProjects = this.getProjects();
		const validProjectIds = new Set<string>();
		activeProjects.forEach((p) => {
			if (p.id) validProjectIds.add(p.id.toLowerCase());
			if (p.key) validProjectIds.add(p.key.toLowerCase());
		});
		const deletedIds = new Set(this.getDeletedTaskIds().map((x) => x.toLowerCase()));
		const rawLocalTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
		const localTasks = rawLocalTasks.filter(
			(t) =>
				t &&
				t.id &&
				!deletedIds.has(t.id.toLowerCase()) &&
				t.projectId &&
				validProjectIds.has(t.projectId.toLowerCase()),
		);
		const mergedMap = new Map<string, Task>();

		const targetProj = projectId
			? activeProjects.find(
					(p) =>
						p.id === projectId ||
						p.id?.toLowerCase() === projectId.toLowerCase() ||
						(p.key && p.key.toLowerCase() === projectId.toLowerCase()),
			  )
			: undefined;
		const validForProj = new Set<string>();
		if (projectId) validForProj.add(projectId.toLowerCase());
		if (targetProj?.id) validForProj.add(targetProj.id.toLowerCase());
		if (targetProj?.key) validForProj.add(targetProj.key.toLowerCase());

		for (const t of serverTasks || []) {
			if (!t || !t.id || deletedIds.has(t.id.toLowerCase())) continue;
			if (!t.projectId || !validProjectIds.has(t.projectId.toLowerCase())) continue;
			mergedMap.set(t.id, t);
		}

		for (const t of localTasks) {
			if (!t || !t.id || deletedIds.has(t.id.toLowerCase())) continue;
			if (!t.projectId || !validProjectIds.has(t.projectId.toLowerCase())) continue;
			if (projectId && !validForProj.has(t.projectId.toLowerCase())) continue;
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
		const otherTasks = projectId
			? localTasks.filter((t) => !validForProj.has(t.projectId?.toLowerCase() || "") && !deletedIds.has(t.id.toLowerCase()))
			: [];
		setItem(STORAGE_KEYS.TASKS, [...otherTasks, ...mergedList]);

		return projectId
			? mergedList.filter((t) => validForProj.has(t.projectId?.toLowerCase() || ""))
			: mergedList;
	},

	// ==================== USERS ====================
	getUsers(): User[] {
		const raw = getItem<any[]>(STORAGE_KEYS.USERS, []);
		const deletedIds = new Set(this.getDeletedUserIds().map((x) => x.toLowerCase()));
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
				if (deletedIds.has(actual.id.toLowerCase()) || (cleanEmail && deletedIds.has(cleanEmail))) {
					needsClean = true;
					continue;
				}
				// Deduplicate by both ID and Email
				if (seenIds.has(actual.id.toLowerCase()) || (cleanEmail && seenEmails.has(cleanEmail))) {
					needsClean = true;
					continue;
				}
				seenIds.add(actual.id.toLowerCase());
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
		const targetId = id.toLowerCase();
		return this.getUsers().find((u) => u.id?.toLowerCase() === targetId || u.email?.trim().toLowerCase() === targetId);
	},

	saveUser(user: any): User {
		const actual: any = user.user ? user.user : user;
		if (!actual || !actual.id) return actual;
		if (!actual.name) {
			actual.name = `${actual.firstName || ""} ${actual.lastName || ""}`.trim() || actual.email || "Member";
		}
		const deleted = this.getDeletedUserIds();
		const actualIdLower = actual.id.toLowerCase();
		const cleanActualEmail = actual.email ? actual.email.trim().toLowerCase() : "";
		if (deleted.some((d) => d.toLowerCase() === actualIdLower || (cleanActualEmail && d.toLowerCase() === cleanActualEmail))) {
			setItem(
				STORAGE_KEYS.DELETED_USERS,
				deleted.filter((id) => id.toLowerCase() !== actualIdLower && id.toLowerCase() !== cleanActualEmail),
			);
		}

		const users = this.getUsers();
		const index = users.findIndex(
			(u) =>
				u.id === actual.id ||
				u.id?.toLowerCase() === actualIdLower ||
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
		const targetId = id.toLowerCase();
		const users = getItem<any[]>(STORAGE_KEYS.USERS, []).map((item) => item?.user || item);
		const targetUser = users.find(
			(u) => u && (u.id === id || u.id?.toLowerCase() === targetId || u.email?.trim().toLowerCase() === targetId),
		);

		const toAdd = new Set<string>([id, targetId]);
		if (targetUser) {
			if (targetUser.id) {
				toAdd.add(targetUser.id);
				toAdd.add(targetUser.id.toLowerCase());
			}
			if (targetUser.email) {
				const emailClean = targetUser.email.trim();
				toAdd.add(emailClean);
				toAdd.add(emailClean.toLowerCase());
			}
		}

		let changed = false;
		for (const item of toAdd) {
			if (!deleted.includes(item)) {
				deleted.push(item);
				changed = true;
			}
		}
		if (changed) {
			setItem(STORAGE_KEYS.DELETED_USERS, deleted);
		}

		const deletedSet = new Set(deleted.map((d) => d.toLowerCase()));
		const remainingUsers = users.filter((u) => {
			if (!u || !u.id) return false;
			if (deletedSet.has(u.id.toLowerCase())) return false;
			if (u.email && deletedSet.has(u.email.trim().toLowerCase())) return false;
			return true;
		});
		setItem(STORAGE_KEYS.USERS, remainingUsers);

		// Also remove deleted user from local projects' member lists
		const projects = this.getProjects();
		const updatedProjects = projects.map((p) => {
			if (p.members && p.members.some((m) => deletedSet.has(m.toLowerCase()))) {
				return { ...p, members: p.members.filter((m) => !deletedSet.has(m.toLowerCase())) };
			}
			return p;
		});
		setItem(STORAGE_KEYS.PROJECTS, updatedProjects);

		// Also unassign deleted user from local tasks
		const allTasks = getItem<Task[]>(STORAGE_KEYS.TASKS, []);
		let tasksChanged = false;
		const updatedTasks = allTasks.map((t) => {
			if (t.assigneeId && deletedSet.has(t.assigneeId.toLowerCase())) {
				tasksChanged = true;
				return { ...t, assigneeId: undefined, assignee: undefined, updatedAt: new Date().toISOString() };
			}
			return t;
		});
		if (tasksChanged) {
			setItem(STORAGE_KEYS.TASKS, updatedTasks);
		}

		return true;
	},

	mergeUsers(serverUsers: any[]): User[] {
		const localUsers = this.getUsers();
		const deletedIds = new Set(this.getDeletedUserIds().map((x) => x.toLowerCase()));
		const localMap = new Map<string, any>();
		const localEmailMap = new Map<string, any>();
		for (const u of localUsers) {
			if (u && u.id) localMap.set(u.id.toLowerCase(), u);
			if (u && u.email) localEmailMap.set(u.email.trim().toLowerCase(), u);
		}

		const userMap = new Map<string, User>();
		const seenEmails = new Set<string>();

		for (const raw of serverUsers || []) {
			const u: any = raw.user ? raw.user : raw;
			if (!u || !u.id || deletedIds.has(u.id.toLowerCase())) continue;
			const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
			if (cleanEmail && deletedIds.has(cleanEmail)) continue;

			if (!u.name) {
				u.name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Member";
			}
			const existing =
				localMap.get(u.id.toLowerCase()) ||
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

			userMap.set(u.id.toLowerCase(), merged);
			if (cleanEmail) seenEmails.add(cleanEmail);
		}

		for (const u of localUsers) {
			if (!u || !u.id || deletedIds.has(u.id.toLowerCase())) continue;
			const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
			if (cleanEmail && deletedIds.has(cleanEmail)) continue;

			if (userMap.has(u.id.toLowerCase()) || (cleanEmail && seenEmails.has(cleanEmail))) {
				continue;
			}
			userMap.set(u.id.toLowerCase(), u);
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
