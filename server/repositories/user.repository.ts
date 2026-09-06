import { v4 as uuidv4 } from "uuid";
import db, { loadDb, saveDb, markUserDeleted } from "../data";
import type { User } from "../types";

export class UserRepository {
	async findAll(): Promise<User[]> {
		const freshDb = loadDb();
		db.users = freshDb.users || [];
		const seenEmails = new Set<string>();
		const deduplicated: User[] = [];
		for (const u of db.users) {
			const cleanEmail = u.email?.trim().toLowerCase();
			if (cleanEmail) {
				if (seenEmails.has(cleanEmail)) continue;
				seenEmails.add(cleanEmail);
			}
			deduplicated.push(u);
		}
		db.users = deduplicated;
		return [...db.users];
	}

	async findByEmail(email: string): Promise<User | undefined> {
		const freshDb = loadDb();
		db.users = freshDb.users;
		const clean = email?.trim().toLowerCase();
		return freshDb.users.find((u: any) => u.email?.trim().toLowerCase() === clean);
	}

	async findById(id: string): Promise<User | undefined> {
		const freshDb = loadDb();
		db.users = freshDb.users;
		return freshDb.users.find((u: any) => u.id === id);
	}

	async create(user: Omit<User, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<User> {
		loadDb();
		const cleanEmail = user.email?.trim().toLowerCase();
		if (cleanEmail) {
			const existingIndex = db.users.findIndex(
				(u: any) => u.email?.trim().toLowerCase() === cleanEmail,
			);
			if (existingIndex >= 0) {
				db.users[existingIndex] = {
					...db.users[existingIndex],
					...user,
				};
				saveDb();
				return db.users[existingIndex];
			}
		}

		const newUser: User = {
			...user,
			id: user.id || uuidv4(),
			createdAt: user.createdAt || new Date().toISOString(),
		};
		db.users.push(newUser);
		saveDb();
		return newUser;
	}

	async update(id: string, updates: Partial<User>): Promise<User> {
		loadDb();
		const index = db.users.findIndex((u: any) => u.id === id);
		if (index === -1) {
			throw new Error("User not found");
		}
		db.users[index] = { ...db.users[index], ...updates };
		saveDb();
		return db.users[index];
	}

	async findByResetToken(token: string): Promise<User | undefined> {
		let user = db.users.find((u: any) => u.resetToken === token);
		if (!user) {
			const freshDb = loadDb();
			user = freshDb.users.find((u: any) => u.resetToken === token);
			if (user) db.users = freshDb.users;
		}
		return user;
	}

	async delete(id: string): Promise<boolean> {
		markUserDeleted(id);
		const freshDb = loadDb();
		const userToDelete = freshDb.users.find((u: any) => u.id === id || u.email === id);
		if (userToDelete) {
			markUserDeleted(userToDelete.id);
			if (userToDelete.email) markUserDeleted(userToDelete.email);
		}

		db.users = (freshDb.users || []).filter((u: any) => u.id !== id && u.email !== id);
		if (freshDb.projects) db.projects = freshDb.projects;
		if (freshDb.tasks) db.tasks = freshDb.tasks;

		const targetId = userToDelete ? userToDelete.id : id;

		// Remove user from all project members & owners
		const idsToRemove = new Set([id, targetId, userToDelete?.email].filter(Boolean));
		if (db.projects) {
			db.projects.forEach((p: any) => {
				if (p.members) {
					p.members = p.members.filter((m: any) => !idsToRemove.has(m));
				}
				if (idsToRemove.has(p.ownerId)) {
					p.ownerId = undefined;
				}
			});
		}

		// Unassign user from all tasks
		if (db.tasks) {
			db.tasks.forEach((t: any) => {
				if (idsToRemove.has(t.assigneeId)) {
					t.assigneeId = null;
				}
				if (t.assignees) {
					t.assignees = t.assignees.filter((a: string) => !idsToRemove.has(a));
				}
			});
		}

		saveDb();
		return true;
	}
}

export const userRepository = new UserRepository();
