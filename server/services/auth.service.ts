import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { userRepository } from "../repositories/user.repository";
import type { User } from "../types";

export class AuthService {
	async login(email: string, passwordPlain: string): Promise<User | null> {
		const cleanEmail = email?.trim().toLowerCase();
		console.log("login attempt:", cleanEmail);
		const user = await userRepository.findByEmail(cleanEmail);
		if (!user) {
			console.log("user not found for email:", cleanEmail);
			return null;
		}

		// Verify using bcrypt or tempPassword
		let isValid = false;
		if (user.passwordHash) {
			try {
				isValid = bcrypt.compareSync(passwordPlain, user.passwordHash);
			} catch (_) {}
		}
		if (!isValid && (user as any).tempPassword) {
			isValid = passwordPlain === (user as any).tempPassword;
		}

		if (!isValid) {
			console.log("password mismatch for:", cleanEmail);
			return null;
		}

		// Only allow ACTIVE users to login
		if (user.status !== "ACTIVE") {
			console.log("user inactive:", cleanEmail);
			throw new Error("Account is inactive");
		}
		
		console.log("login success:", cleanEmail);
		return user;
	}

	async setupAccount(userId: string, currentTempPasswordPlain: string, newPasswordPlain: string, userEmail?: string): Promise<User> {
		const cleanEmail = userEmail?.trim().toLowerCase();
		let user = await userRepository.findById(userId);
		if (!user && cleanEmail) {
			user = await userRepository.findByEmail(cleanEmail);
		}
		if (!user) {
			// If running in a stateless serverless container that didn't have the user, create record
			const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);
			return userRepository.create({
				name: cleanEmail || "Member",
				email: cleanEmail || "",
				role: "MEMBER",
				status: "ACTIVE",
				passwordHash: hashedPassword,
				isFirstLogin: false,
				passwordChangedAt: new Date().toISOString(),
			});
		}
		
		let isValid = false;
		if (user.passwordHash) {
			try {
				isValid = bcrypt.compareSync(currentTempPasswordPlain, user.passwordHash);
			} catch (_) {}
		}
		if (!isValid && (user as any).tempPassword) {
			isValid = currentTempPasswordPlain === (user as any).tempPassword;
		}

		if (!isValid && user.isFirstLogin) {
			throw new Error("Incorrect temporary password");
		}

		const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);
		
		const updatedUser = await userRepository.update(user.id, {
			passwordHash: hashedPassword,
			isFirstLogin: false,
			tempPassword: null as any,
			passwordChangedAt: new Date().toISOString(),
		});

		delete (updatedUser as any).tempPassword;

		return updatedUser;
	}

	async requestPasswordReset(email: string): Promise<void> {
		console.log("Looking up user for reset:", email);
		const user = await userRepository.findByEmail(email);
		if (!user) {
			console.log("User not found in DB for email:", email);
			// Resolve silently to prevent email enumeration
			return;
		}
		console.log("User found:", user.id);

		const resetToken = crypto.randomBytes(32).toString("hex");
		// Expiry: 30 minutes from now
		const resetTokenExpiry = Date.now() + 30 * 60 * 1000;

		await userRepository.update(user.id, {
			resetToken,
			resetTokenExpiry,
		});

		// Simulate sending email
		console.log(`\n=================================================`);
		console.log(`[SIMULATED EMAIL DELIVERY]`);
		console.log(`To: ${user.email}`);
		console.log(`Subject: Reset Your Password`);
		const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
		console.log(
			`Link: ${baseUrl}/auth/reset-password?token=${resetToken}`,
		);
		console.log(`=================================================\n`);
	}


	async resetPassword(token: string, newPasswordPlain: string): Promise<{ email: string; passwordHash: string }> {
		const user = await userRepository.findByResetToken(token);
		if (!user) {
			throw new Error("Invalid or expired token");
		}

		if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
			throw new Error("Invalid or expired token");
		}

		const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);

		await userRepository.update(user.id, {
			passwordHash: hashedPassword,
			resetToken: undefined,
			resetTokenExpiry: undefined,
		});

		return { email: user.email, passwordHash: hashedPassword };
	}
}

export const authService = new AuthService();
