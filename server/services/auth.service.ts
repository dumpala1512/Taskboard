import * as bcrypt from "bcryptjs";
import crypto from "crypto";
import { userRepository } from "../repositories/user.repository";
import type { User } from "../types";

export class AuthService {
	async login(email: string, passwordPlain: string): Promise<User | null> {
		console.log("login attempt:", email);
		const user = await userRepository.findByEmail(email);
		if (!user) {
			console.log("user not found for email:", email);
			return null;
		}

		// Verify using bcrypt
		const isValid = bcrypt.compareSync(passwordPlain, user.passwordHash);
		if (!isValid) {
			console.log("password mismatch for:", email);
			return null;
		}

		// Only allow ACTIVE users to login
		if (user.status !== "ACTIVE") {
			console.log("user inactive:", email);
			throw new Error("Account is inactive");
		}
		
		console.log("login success:", email);
		return user;
	}

	async setupAccount(userId: string, currentTempPasswordPlain: string, newPasswordPlain: string, userEmail?: string): Promise<User> {
		let user = await userRepository.findById(userId);
		if (!user && userEmail) {
			user = await userRepository.findByEmail(userEmail);
		}
		if (!user) {
			// If running in a stateless serverless container that didn't have the user, create record
			const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);
			return userRepository.create({
				name: userEmail || "Member",
				email: userEmail || "",
				role: "MEMBER",
				status: "ACTIVE",
				passwordHash: hashedPassword,
				isFirstLogin: false,
				passwordChangedAt: new Date().toISOString(),
			});
		}
		
		if (user.passwordHash) {
			const isValid = bcrypt.compareSync(currentTempPasswordPlain, user.passwordHash);
			if (!isValid && user.isFirstLogin) {
				throw new Error("Incorrect temporary password");
			}
		}

		const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);
		
		const updatedUser = await userRepository.update(user.id, {
			passwordHash: hashedPassword,
			isFirstLogin: false,
			passwordChangedAt: new Date().toISOString(),
		});

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


	async resetPassword(token: string, newPasswordPlain: string): Promise<void> {
		const user = await userRepository.findByResetToken(token);
		if (!user) {
			throw new Error("Invalid or expired token");
		}

		if (!user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
			throw new Error("Invalid or expired token");
		}

		const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);

		// TypeScript might complain if we try to set them to undefined directly
		// since they are optional, we can cast it or use null. Actually, omitting them from partial works,
		// but we need to delete them. We can set them to undefined.
		await userRepository.update(user.id, {
			passwordHash: hashedPassword,
			resetToken: undefined,
			resetTokenExpiry: undefined,
		});
	}
}

export const authService = new AuthService();
