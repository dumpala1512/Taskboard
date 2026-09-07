import fs from "fs";
import os from "os";
import path from "path";
import { seedDatabase } from "../database/seed";
import type { Database } from "../types";

const isVercel = !!process.env.VERCEL;
const bundledDbPath = path.join(process.cwd(), "server", "database", "db.json");
const dbPath = isVercel ? path.join(os.tmpdir(), "db.json") : bundledDbPath;

declare global {
	var __db2: Database | undefined;
}

let db: Database;

// Track deleted IDs across all entities
export const deletedUserIds = new Set<string>();
export const deletedProjectIds = new Set<string>();
export const deletedTaskIds = new Set<string>();

export function markUserDeleted(id: string) {
	if (id) {
		deletedUserIds.add(id);
		deletedUserIds.add(id.toLowerCase());
	}
}

export function markProjectDeleted(id: string, key?: string) {
	if (id) {
		deletedProjectIds.add(id);
		deletedProjectIds.add(id.toLowerCase());
	}
	if (key) {
		deletedProjectIds.add(key);
		deletedProjectIds.add(key.toLowerCase());
	}
}

export function markTaskDeleted(id: string) {
	if (id) {
		deletedTaskIds.add(id);
		deletedTaskIds.add(id.toLowerCase());
	}
}

export function unmarkUserDeleted(id: string, email?: string) {
	if (id) {
		deletedUserIds.delete(id);
		deletedUserIds.delete(id.toLowerCase());
	}
	if (email) {
		deletedUserIds.delete(email);
		deletedUserIds.delete(email.toLowerCase());
	}
}

export function unmarkProjectDeleted(id: string, key?: string) {
	if (id) {
		deletedProjectIds.delete(id);
		deletedProjectIds.delete(id.toLowerCase());
	}
	if (key) {
		deletedProjectIds.delete(key);
		deletedProjectIds.delete(key.toLowerCase());
	}
}

export function isUserDeleted(id?: string): boolean {
	if (!id) return false;
	return deletedUserIds.has(id) || deletedUserIds.has(id.toLowerCase());
}

export function isProjectDeleted(id?: string, key?: string): boolean {
	if (id && (deletedProjectIds.has(id) || deletedProjectIds.has(id.toLowerCase()))) return true;
	if (key && (deletedProjectIds.has(key) || deletedProjectIds.has(key.toLowerCase()))) return true;
	return false;
}

export function isTaskDeleted(id?: string): boolean {
	if (!id) return false;
	return deletedTaskIds.has(id) || deletedTaskIds.has(id.toLowerCase());
}

export function attachDeletedHeaders(res: any) {
	if (!res || typeof res.setHeader !== "function" || res.headersSent) return;
	try {
		res.setHeader("x-deleted-projects", JSON.stringify(Array.from(deletedProjectIds)));
		res.setHeader("x-deleted-users", JSON.stringify(Array.from(deletedUserIds)));
		res.setHeader("x-deleted-tasks", JSON.stringify(Array.from(deletedTaskIds)));
	} catch (_) {}
}

// Maximum db.json file size before auto-clearing non-admin data (500 KB)
const MAX_DB_SIZE_BYTES = 500 * 1024;

export function clearDbExceptAdmin(existingDb?: Database): Database {
	const source = existingDb || (db ? db : seedDatabase());
	const adminUsers = (source.users || []).filter(
		(u: any) => u.role === "ADMIN" || u.id === "admin-1",
	);
	if (adminUsers.length === 0) {
		adminUsers.push(...seedDatabase().users);
	}

	const cleanDb: Database = {
		users: adminUsers,
		projects: [],
		tasks: [],
		activities: [],
		deletedUserIds: Array.from(deletedUserIds),
		deletedProjectIds: Array.from(deletedProjectIds),
		deletedTaskIds: Array.from(deletedTaskIds),
	};

	try {
		const data = JSON.stringify(cleanDb, null, 2);
		fs.writeFileSync(dbPath, data);
		if (fs.existsSync(bundledDbPath) && bundledDbPath !== dbPath) {
			try {
				fs.writeFileSync(bundledDbPath, data);
			} catch (_) {}
		}
	} catch (e) {
		console.error("Failed to write cleanDb:", e);
	}

	if (db) {
		db.users = cleanDb.users;
		db.projects = cleanDb.projects;
		db.tasks = cleanDb.tasks;
		db.activities = cleanDb.activities;
		db.deletedUserIds = cleanDb.deletedUserIds;
		db.deletedProjectIds = cleanDb.deletedProjectIds;
		db.deletedTaskIds = cleanDb.deletedTaskIds;
	}

	return cleanDb;
}

export function loadDb(): Database {
	if (isVercel && !fs.existsSync(dbPath)) {
		try {
			if (fs.existsSync(bundledDbPath)) {
				const initialData = fs.readFileSync(bundledDbPath, "utf-8");
				fs.writeFileSync(dbPath, initialData);
			}
		} catch (e) {
			console.warn("Could not copy bundled db.json to /tmp, falling back to seed", e);
		}
	}

	if (fs.existsSync(dbPath)) {
		try {
			const stats = fs.statSync(dbPath);
			if (stats.size > MAX_DB_SIZE_BYTES) {
				console.warn(`db.json size (${stats.size} bytes) exceeds limit. Auto-clearing except admin user.`);
				return clearDbExceptAdmin();
			}

			const data = fs.readFileSync(dbPath, "utf-8");
			const parsed: Database = JSON.parse(data);

			// Populate deleted IDs from disk
			if (Array.isArray(parsed.deletedUserIds)) {
				parsed.deletedUserIds.forEach((id: string) => markUserDeleted(id));
			}
			if (Array.isArray(parsed.deletedProjectIds)) {
				parsed.deletedProjectIds.forEach((id: string) => markProjectDeleted(id));
			}
			if (Array.isArray(parsed.deletedTaskIds)) {
				parsed.deletedTaskIds.forEach((id: string) => markTaskDeleted(id));
			}

			// Filter out permanently deleted entities
			const filteredUsers = (parsed.users || []).filter(
				(u: any) => u && !isUserDeleted(u.id) && !isUserDeleted(u.email),
			);
			const filteredProjects = (parsed.projects || []).filter(
				(p: any) => p && !isProjectDeleted(p.id, p.key),
			);
			const filteredTasks = (parsed.tasks || []).filter(
				(t: any) => t && !isTaskDeleted(t.id) && !isProjectDeleted(t.projectId),
			);
			const filteredActivities = (parsed.activities || []).filter(
				(a: any) =>
					a &&
					!isProjectDeleted(a.projectId) &&
					!isTaskDeleted(a.taskId) &&
					!isUserDeleted(a.userId),
			);

			if (db) {
				db.users = filteredUsers;
				db.projects = filteredProjects;
				db.tasks = filteredTasks;
				db.activities = filteredActivities;
				db.deletedUserIds = Array.from(deletedUserIds);
				db.deletedProjectIds = Array.from(deletedProjectIds);
				db.deletedTaskIds = Array.from(deletedTaskIds);
			}

			return {
				users: filteredUsers,
				projects: filteredProjects,
				tasks: filteredTasks,
				activities: filteredActivities,
				deletedUserIds: Array.from(deletedUserIds),
				deletedProjectIds: Array.from(deletedProjectIds),
				deletedTaskIds: Array.from(deletedTaskIds),
			};
		} catch (e) {
			console.error("Failed to parse db.json, re-seeding", e);
		}
	}

	const seeded = seedDatabase();
	const newDb: Database = {
		...seeded,
		deletedUserIds: Array.from(deletedUserIds),
		deletedProjectIds: Array.from(deletedProjectIds),
		deletedTaskIds: Array.from(deletedTaskIds),
	};

	try {
		fs.writeFileSync(dbPath, JSON.stringify(newDb, null, 2));
	} catch (e) {
		console.error("Failed to write seed db:", e);
	}

	if (db) {
		db.users = newDb.users;
		db.projects = newDb.projects;
		db.tasks = newDb.tasks;
		db.activities = newDb.activities;
		db.deletedUserIds = newDb.deletedUserIds;
		db.deletedProjectIds = newDb.deletedProjectIds;
		db.deletedTaskIds = newDb.deletedTaskIds;
	}
	return newDb;
}

export function saveDb() {
	if (!db) return;

	try {
		// Clean up db contents against tombstone sets before saving
		db.users = (db.users || []).filter(
			(u: any) => u && !isUserDeleted(u.id) && !isUserDeleted(u.email),
		);
		db.projects = (db.projects || []).filter(
			(p: any) => p && !isProjectDeleted(p.id, p.key),
		);
		db.tasks = (db.tasks || []).filter(
			(t: any) => t && !isTaskDeleted(t.id) && !isProjectDeleted(t.projectId),
		);
		db.activities = (db.activities || []).filter(
			(a: any) =>
				a &&
				!isProjectDeleted(a.projectId) &&
				!isTaskDeleted(a.taskId) &&
				!isUserDeleted(a.userId),
		);

		db.deletedUserIds = Array.from(deletedUserIds);
		db.deletedProjectIds = Array.from(deletedProjectIds);
		db.deletedTaskIds = Array.from(deletedTaskIds);

		const data = JSON.stringify(db, null, 2);
		fs.writeFileSync(dbPath, data);
		if (fs.existsSync(bundledDbPath) && bundledDbPath !== dbPath) {
			try {
				fs.writeFileSync(bundledDbPath, data);
			} catch (_) {}
		}
	} catch (e) {
		console.error("Failed to save db:", e);
	}
}

if (process.env.NODE_ENV === "production") {
	db = loadDb();
} else {
	global.__db2 = loadDb();
	db = global.__db2;
}

export default db;
