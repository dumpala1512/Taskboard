import * as bcrypt from "bcryptjs";
import {
	type Activity,
	type Database,
	type Project,
	type ProjectStatus,
	type Task,
	type TaskPriority,
	type TaskStatus,
	type TaskTag,
	type User,
	UserRole,
} from "../types";

export function seedDatabase(): Database {
	const users: User[] = [];
	const projects: Project[] = [];
	const tasks: Task[] = [];
	const activities: Activity[] = [];

	const defaultAdminPassword = bcrypt.hashSync("Admin@123", 10);
	const defaultMemberPassword = bcrypt.hashSync("Password123!", 10);

	// 1. Generate Users (1 Admin, 19 Members)
	users.push({
		id: "admin-1",
		name: "System Administrator",
		email: "admin@teamhub.com",
		role: "ADMIN",
		status: "ACTIVE",
		passwordHash: defaultAdminPassword,
		createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
	});

	// Removed mock members loop

	// 2. Generate Projects (Cleared for clean slate)
	// 3. Generate Tasks (Cleared for clean slate)
	// 4. Generate Activity Records (Cleared for clean slate)

	return {
		users,
		projects,
		tasks,
		activities,
	};
}
