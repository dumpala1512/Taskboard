import * as bcrypt from "bcryptjs";
import { userRepository } from "../repositories/user.repository";
import type { User, UserRole, UserStatus } from "../types";

export class AdminService {
	async getAllUsers(): Promise<User[]> {
		return userRepository.findAll();
	}

	async getAllUsersWithStats(): Promise<any[]> {
		const users = await userRepository.findAll();
		const projects = await import("../repositories/project.repository").then(m => m.projectRepository.findAll());
		const tasks = await import("../repositories/task.repository").then(m => m.taskRepository.findAll());

		return users.map(user => {
			const assignedProjects = projects.filter(p => p.members?.includes(user.id));
			const assignedTasks = tasks.filter(t => t.assignees?.includes(user.id) || t.assigneeId === user.id);
			
			// Exclude sensitive fields
			const { passwordHash, resetToken, resetTokenExpiry, ...safeUser } = user;
			
			return {
				...safeUser,
				projectsAssigned: assignedProjects.length,
				tasksAssigned: assignedTasks.length,
				assignedProjectsList: assignedProjects.map(p => ({ id: p.id, name: p.name, status: p.status, progress: p.progress })),
				assignedTasksList: assignedTasks.map(t => ({ id: t.id, title: t.title, status: t.status, projectId: t.projectId, dueDate: t.dueDate })),
			};
		});
	}

	private generateTemporaryPassword(): string {
		const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
		let password = "";
		// Ensure at least one of each required character type
		password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
		password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
		password += "0123456789"[Math.floor(Math.random() * 10)];
		password += "!@#$%^&*()_+"[Math.floor(Math.random() * 12)];
		
		// Fill the rest to reach 12 characters
		for (let i = password.length; i < 12; i++) {
			password += chars[Math.floor(Math.random() * chars.length)];
		}
		
		// Shuffle the password
		return password.split('').sort(() => 0.5 - Math.random()).join('');
	}

	async createUser(data: {
		firstName: string;
		lastName: string;
		email: string;
		role: UserRole;
		department?: string;
		jobTitle?: string;
		phone?: string;
		joiningDate?: string;
		createdBy?: string;
	}): Promise<{ user: User, temporaryPasswordPlain: string }> {
		const existing = await userRepository.findByEmail(data.email);
		if (existing) {
			throw new Error("Email is already registered");
		}

		const temporaryPasswordPlain = this.generateTemporaryPassword();
		const hashedPassword = bcrypt.hashSync(temporaryPasswordPlain, 10);

		const user = await userRepository.create({
			name: `${data.firstName} ${data.lastName}`,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			role: data.role,
			status: "ACTIVE",
			department: data.department,
			jobTitle: data.jobTitle,
			phone: data.phone,
			joiningDate: data.joiningDate,
			passwordHash: hashedPassword,
			isFirstLogin: true,
			createdBy: data.createdBy,
		});

		return { user, temporaryPasswordPlain };
	}

	async resetUserPassword(id: string): Promise<{ temporaryPasswordPlain: string }> {
		const user = await userRepository.findById(id);
		if (!user) {
			throw new Error("User not found");
		}

		const temporaryPasswordPlain = this.generateTemporaryPassword();
		const hashedPassword = bcrypt.hashSync(temporaryPasswordPlain, 10);

		await userRepository.update(id, {
			passwordHash: hashedPassword,
			isFirstLogin: true,
		});

		return { temporaryPasswordPlain };
	}

	async updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User> {
		let user = await userRepository.findById(id);
		if (!user) {
			user = await userRepository.findByEmail(id);
		}
		if (!user) {
			throw new Error("User not found");
		}

		const updates: any = { ...data };
		if (updates.password) {
			updates.passwordHash = bcrypt.hashSync(updates.password, 10);
			updates.isFirstLogin = false;
			updates.passwordChangedAt = new Date().toISOString();
			delete updates.password;
		}

		return userRepository.update(user.id, updates);
	}

	async deleteUser(id: string): Promise<boolean> {
		const user = await userRepository.findById(id);
		if (!user) {
			throw new Error("User not found");
		}

		return userRepository.delete(id);
	}
}

export const adminService = new AdminService();
