import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authService } from "../../../server/services/auth.service";

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

				const user = await authService.login(
					credentials.email,
					credentials.password,
				);

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
