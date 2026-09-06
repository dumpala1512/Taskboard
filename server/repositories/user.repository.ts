import db, { loadDb, saveDb } from "../data";
import type { User } from "../types";
import { v4 as uuidv4 } from "uuid";

export class UserRepository {
	async findAll(): Promise<User[]> {
		const freshDb = loadDb();
		db.users = freshDb.users;
		return [...db.users];
	}

	async findByEmail(email: string): Promise<User | undefined> {
		let user = db.users.find((u: any) => u.email === email);
		if (!user) {
			const freshDb = loadDb();
			user = freshDb.users.find((u: any) => u.email === email);
			if (user) db.users = freshDb.users;
		}
		return user;
	}

	async findById(id: string): Promise<User | undefined> {
		let user = db.users.find((u: any) => u.id === id);
		if (!user) {
			const freshDb = loadDb();
			user = freshDb.users.find((u: any) => u.id === id);
			if (user) db.users = freshDb.users;
		}
		return user;
	}

	async create(user: Omit<User, "id" | "createdAt">): Promise<User> {
		loadDb();
		const newUser: User = {
			...user,
			id: uuidv4(),
			createdAt: new Date().toISOString(),
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
		const freshDb = loadDb();
		db.users = freshDb.users;
		if (freshDb.projects) db.projects = freshDb.projects;
		if (freshDb.tasks) db.tasks = freshDb.tasks;

		const index = db.users.findIndex((u: any) => u.id === id);
		if (index === -1) return false;
		db.users.splice(index, 1);

		// Remove user from all project members & owners
		if (db.projects) {
			db.projects.forEach((p: any) => {
				if (p.members && p.members.includes(id)) {
					p.members = p.members.filter((m: any) => m !== id);
				}
				if (p.ownerId === id) {
					p.ownerId = undefined;
				}
			});
		}

		// Unassign user from all tasks
		if (db.tasks) {
			db.tasks.forEach((t: any) => {
				if (t.assigneeId === id) {
					t.assigneeId = null;
				}
				if (t.assignees && t.assignees.includes(id)) {
					t.assignees = t.assignees.filter((a: string) => a !== id);
				}
			});
		}

		saveDb();
		return true;
	}
}

export const userRepository = new UserRepository();
