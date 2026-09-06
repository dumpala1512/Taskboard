import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authService } from "../../../server/services/auth.service";
import { userRepository } from "../../../server/repositories/user.repository";

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: {
					label: "Email",
					type: "email",
					placeholder: "you@company.com",
				},
				password: { label: "Password", type: "password" },
				localUsers: { label: "Local Users", type: "text" },
			},
			async authorize(credentials, req) {
				if (!credentials?.email || !credentials?.password) return null;

				let user = await authService.login(
					credentials.email,
					credentials.password,
				).catch(() => null);

				// Fallback: If serverless lambda does not have the user in db.json, check localUsers
				if (!user && (credentials as any)?.localUsers) {
					try {
						const localUsers = JSON.parse((credentials as any).localUsers);
						if (Array.isArray(localUsers)) {
							const matched = localUsers.find(
								(u: any) => u.email?.toLowerCase() === credentials.email.toLowerCase()
							);
							let isMatch = false;
							if (matched && matched.passwordHash) {
								isMatch = bcrypt.compareSync(credentials.password, matched.passwordHash);
							} else if (matched && matched.tempPassword) {
								isMatch = credentials.password === matched.tempPassword;
							}

							if (isMatch) {
								const existingInDb = await userRepository.findByEmail(matched.email);
								const passwordHashToSave = matched.passwordHash || bcrypt.hashSync(credentials.password, 10);
								if (!existingInDb) {
									const created = await userRepository.create({
										name: matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.email,
										email: matched.email,
										role: matched.role || "MEMBER",
										status: matched.status || "ACTIVE",
										passwordHash: passwordHashToSave,
										isFirstLogin: matched.isFirstLogin ?? true,
										department: matched.department,
										jobTitle: matched.jobTitle,
										phone: matched.phone,
										joiningDate: matched.joiningDate,
									});
									user = created;
								} else {
									user = existingInDb;
								}
							}
						}
					} catch (e) {
						console.error("Failed to parse localUsers in authorize", e);
					}
				}

				if (user) {
					return {
						id: user.id,
						name: user.name,
						email: user.email,
						role: user.role,
						status: user.status,
						isFirstLogin: user.isFirstLogin,
					};
				}

				return null;
			},
		}),
	],
	pages: {
		signIn: "/auth/signin",
	},
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			if (trigger === "update" && session) {
				if (typeof session.isFirstLogin !== "undefined") {
					token.isFirstLogin = session.isFirstLogin;
				}
			}
			if (user) {
				token.id = user.id;
				token.role = (user as any).role;
				token.status = (user as any).status;
				token.isFirstLogin = (user as any).isFirstLogin;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.id) {
				(session.user as any).id = token.id;
				(session.user as any).role = token.role;
				(session.user as any).status = token.status;
				(session.user as any).isFirstLogin = token.isFirstLogin;
			}
			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
};

export default NextAuth(authOptions);
