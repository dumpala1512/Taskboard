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

export function loadDb(): Database {
	if (isVercel && !fs.existsSync(dbPath)) {
		try {
			if (fs.existsSync(bundledDbPath)) {
				const initialData = fs.readFileSync(bundledDbPath, "utf-8");
				fs.writeFileSync(dbPath, initialData);
				return JSON.parse(initialData);
			}
		} catch (e) {
			console.warn("Could not copy bundled db.json to /tmp, falling back to seed", e);
		}
	}

	if (fs.existsSync(dbPath)) {
		try {
			const data = fs.readFileSync(dbPath, "utf-8");
			return JSON.parse(data);
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
	return seeded;
}

export function saveDb() {
	if (db) {
		try {
			fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
		} catch (e) {
			console.error("Failed to save db:", e);
		}
	}
}

if (process.env.NODE_ENV === "production") {
	db = loadDb();
} else {
	global.__db2 = loadDb();
	db = global.__db2;
}

export default db;

