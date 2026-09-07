import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authService } from "../../../server/services/auth.service";
import { userRepository } from "../../../server/repositories/user.repository";
import { isUserDeleted, loadDb } from "../../../server/data";

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

				loadDb();
				const cleanEmail = credentials.email.trim().toLowerCase();
				if (isUserDeleted(cleanEmail)) {
					return null;
				}

				let user = await authService.login(
					cleanEmail,
					credentials.password,
				).catch(() => null);

				// Fallback: If serverless lambda does not have the user in db.json, check localUsers
				if (!user && (credentials as any)?.localUsers) {
					try {
						const localUsers = JSON.parse((credentials as any).localUsers);
						if (Array.isArray(localUsers)) {
							const matched = localUsers.find(
								(u: any) => u.email?.trim().toLowerCase() === cleanEmail
							);
							// Do not resurrect deleted user from localUsers
							if (matched && (isUserDeleted(matched.id) || isUserDeleted(cleanEmail))) {
								return null;
							}
							let isMatch = false;
							if (matched && matched.passwordHash) {
								try {
									isMatch = bcrypt.compareSync(credentials.password, matched.passwordHash);
								} catch (_) {}
							}
							if (!isMatch && matched && matched.tempPassword) {
								isMatch = credentials.password === matched.tempPassword;
							}

							if (isMatch) {
								const existingInDb = await userRepository.findByEmail(cleanEmail);
								// Always compute a fresh bcrypt hash from credentials.password if matched via tempPassword or if hash invalid
								const passwordHashToSave = (matched && credentials.password === matched.tempPassword)
									? bcrypt.hashSync(credentials.password, 10)
									: (matched?.passwordHash || bcrypt.hashSync(credentials.password, 10));
								if (!existingInDb) {
									const created = await userRepository.create({
										id: matched.id,
										name: matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.email || cleanEmail,
										email: cleanEmail,
										role: matched.role || "MEMBER",
										status: matched.status || "ACTIVE",
										passwordHash: passwordHashToSave,
										isFirstLogin: matched.isFirstLogin ?? false,
										department: matched.department,
										jobTitle: matched.jobTitle,
										phone: matched.phone,
										joiningDate: matched.joiningDate,
									});
									user = created;
								} else {
									// Synchronize verified credentials and isFirstLogin state to database
									const needsUpdate = !existingInDb.passwordHash || 
										!bcrypt.compareSync(credentials.password, existingInDb.passwordHash) ||
										existingInDb.isFirstLogin !== matched.isFirstLogin;
									if (needsUpdate) {
										await userRepository.update(existingInDb.id, {
											passwordHash: passwordHashToSave,
											isFirstLogin: matched.isFirstLogin ?? false,
											status: "ACTIVE",
										});
										existingInDb.passwordHash = passwordHashToSave;
										existingInDb.isFirstLogin = matched.isFirstLogin ?? false;
									}
									user = existingInDb;
								}
							}
						}
					} catch (e) {
						console.error("Failed to parse localUsers in authorize", e);
					}
				}

				if (user) {
					if (isUserDeleted(user.id) || isUserDeleted(user.email)) {
						return null;
					}
					const isFirstLogin = (user.isFirstLogin === false || !!user.passwordChangedAt) ? false : !!user.isFirstLogin;
					return {
						id: user.id,
						name: user.name,
						email: user.email,
						role: user.role,
						status: user.status,
						isFirstLogin: isFirstLogin,
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
			// Verify in real-time if the user has already changed their password
			if (token.id && token.isFirstLogin) {
				try {
					const dbUser = await userRepository.findById(token.id as string);
					if (dbUser && (dbUser.isFirstLogin === false || !!dbUser.passwordChangedAt)) {
						token.isFirstLogin = false;
					}
				} catch (_) {}
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user && token.id) {
				if (isUserDeleted(token.id as string) || isUserDeleted(session.user.email || undefined)) {
					return null as any;
				}
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
