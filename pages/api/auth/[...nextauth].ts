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
			},
			async authorize(credentials, req) {
				if (!credentials?.email || !credentials?.password) return null;

				const cleanEmail = credentials.email.trim().toLowerCase();
				const candidateUrls = [
					process.env.INTERNAL_API_URL,
					"http://host.docker.internal:8000/taskboard/api/v1",
					process.env.NEXT_PUBLIC_API_URL,
					"http://localhost:8000/taskboard/api/v1",
				].filter(Boolean) as string[];

				for (const backendUrl of candidateUrls) {
					try {
						// 1. Authenticate with real FastAPI backend
						const loginRes = await fetch(`${backendUrl}/auth/login`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								email: cleanEmail,
								password: credentials.password,
							}),
						});

						if (loginRes.ok) {
							const tokenData = await loginRes.json();
							const accessToken = tokenData.access_token;
							const refreshToken = tokenData.refresh_token;

							// 2. Fetch authenticated profile via /auth/me
							const meRes = await fetch(`${backendUrl}/auth/me`, {
								method: "GET",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${accessToken}`,
								},
							});

							if (meRes.ok) {
								const meData = await meRes.json();
								const userRole = (meData.role || "MEMBER").toUpperCase();

								return {
									id: String(meData.id),
									name: meData.full_name || meData.name || cleanEmail.split("@")[0],
									email: meData.email,
									role: userRole,
									status: "ACTIVE",
									isFirstLogin: false,
									accessToken: accessToken,
									refreshToken: refreshToken,
								};
							}
						} else if (loginRes.status === 401 || loginRes.status === 400) {
							// Backend reached and returned invalid credentials
							console.warn("Backend rejected credentials for:", cleanEmail);
							return null;
						}
					} catch (err) {
						// Network connection to this candidate URL failed, try next candidate
						continue;
					}
				}

				// Fallback to local authService if FastAPI is offline or local dev seed
				loadDb();
				if (isUserDeleted(cleanEmail)) {
					return null;
				}

				const user = await authService.login(
					cleanEmail,
					credentials.password,
				).catch(() => null);

				if (user) {
					if (isUserDeleted(user.id) || isUserDeleted(user.email)) {
						return null;
					}
					const isFirstLogin =
						user.isFirstLogin === false || !!user.passwordChangedAt
							? false
							: !!user.isFirstLogin;
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
				token.name = user.name;
				token.email = user.email;
				token.role = (user as any).role;
				token.status = (user as any).status;
				token.isFirstLogin = (user as any).isFirstLogin;
				token.accessToken = (user as any).accessToken;
				token.refreshToken = (user as any).refreshToken;
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
				(session as any).accessToken = token.accessToken;
				(session as any).refreshToken = token.refreshToken;
			}
			return session;
		},
		async redirect({ url, baseUrl }) {
			if (url.startsWith("/")) {
				if (process.env.VERCEL_URL) {
					return `https://${process.env.VERCEL_URL}${url}`;
				}
				return `${baseUrl}${url}`;
			}
			return baseUrl;
		},
	},
	secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
};

export default NextAuth(authOptions);
