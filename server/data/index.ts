import fs from "fs";
import os from "os";
import path from "path";
import { seedDatabase } from "../database/seed";
import type { Database } from "../types";

const isVercel = !!process.env.VERCEL;
const bundledDbPath = path.join(process.cwd(), "server", "database", "db.json");
const dbPath = isVercel ? path.join(os.tmpdir(), "db.json") : bundledDbPath;

// Extend the global object to hold our database in development
// This prevents Next.js hot-reloads from clearing the data
declare global {
	var __db2: Database | undefined;
}

let db: Database;

// Maximum db.json file size before auto-clearing non-admin data (500 KB)
const MAX_DB_SIZE_BYTES = 500 * 1024;

export function clearDbExceptAdmin(existingDb?: Database): Database {
	const source = existingDb || (db ? db : seedDatabase());
	const adminUsers = (source.users || []).filter((u: any) => u.role === "ADMIN" || u.id === "admin-1");
	if (adminUsers.length === 0) {
		adminUsers.push(...seedDatabase().users);
	}

	const cleanDb: Database = {
		users: adminUsers,
		projects: [],
		tasks: [],
		activities: [],
	};

	try {
		fs.writeFileSync(dbPath, JSON.stringify(cleanDb, null, 2));
		if (fs.existsSync(bundledDbPath) && bundledDbPath !== dbPath) {
			try {
				fs.writeFileSync(bundledDbPath, JSON.stringify(cleanDb, null, 2));
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
	}

	return cleanDb;
}

export function loadDb(): Database {
	if (isVercel && !fs.existsSync(dbPath)) {
		try {
			if (fs.existsSync(bundledDbPath)) {
				const initialData = fs.readFileSync(bundledDbPath, "utf-8");
				fs.writeFileSync(dbPath, initialData);
				const parsed = JSON.parse(initialData);
				if (db) {
					db.users = parsed.users || [];
					db.projects = parsed.projects || [];
					db.tasks = parsed.tasks || [];
					db.activities = parsed.activities || [];
				}
				return parsed;
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
			const parsed = JSON.parse(data);
			if (db) {
				db.users = parsed.users || [];
				db.projects = parsed.projects || [];
				db.tasks = parsed.tasks || [];
				db.activities = parsed.activities || [];
			}
			return parsed;
		} catch (e) {
			console.error("Failed to parse db.json, re-seeding", e);
		}
	}

	const seeded = seedDatabase();
	try {
		fs.writeFileSync(dbPath, JSON.stringify(seeded, null, 2));
	} catch (e) {
		console.error("Failed to write seed db:", e);
	}

	if (db) {
		db.users = seeded.users || [];
		db.projects = seeded.projects || [];
		db.tasks = seeded.tasks || [];
		db.activities = seeded.activities || [];
	}
	return seeded;
}

export function saveDb() {
	if (!db) return;

	try {
		// Read current disk content to ensure cross-request writes (e.g. users, projects) are not lost
		let diskDb: Database | null = null;
		if (fs.existsSync(dbPath)) {
			try {
				const stats = fs.statSync(dbPath);
				if (stats.size > MAX_DB_SIZE_BYTES) {
					clearDbExceptAdmin();
					return;
				}
				const raw = fs.readFileSync(dbPath, "utf-8");
				diskDb = JSON.parse(raw);
			} catch (_) {
				diskDb = null;
			}
		}

		if (diskDb) {
			// Safely merge users: never drop users present on disk
			const userMap = new Map<string, any>();
			(diskDb.users || []).forEach((u: any) => userMap.set(u.id, u));
			(db.users || []).forEach((u: any) => {
				const existing = userMap.get(u.id);
				userMap.set(u.id, { ...existing, ...u });
			});

			// Safely merge projects
			const projectMap = new Map<string, any>();
			(diskDb.projects || []).forEach((p: any) => projectMap.set(p.id, p));
			(db.projects || []).forEach((p: any) => {
				const existing = projectMap.get(p.id);
				projectMap.set(p.id, { ...existing, ...p });
			});

			// Safely merge tasks
			const taskMap = new Map<string, any>();
			(diskDb.tasks || []).forEach((t: any) => taskMap.set(t.id, t));
			(db.tasks || []).forEach((t: any) => {
				const existing = taskMap.get(t.id);
				taskMap.set(t.id, { ...existing, ...t });
			});

			// Safely merge activities
			const actMap = new Map<string, any>();
			(diskDb.activities || []).forEach((a: any) => actMap.set(a.id, a));
			(db.activities || []).forEach((a: any) => actMap.set(a.id, a));

			db.users = Array.from(userMap.values());
			db.projects = Array.from(projectMap.values());
			db.tasks = Array.from(taskMap.values());
			db.activities = Array.from(actMap.values());
		}

		fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
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

