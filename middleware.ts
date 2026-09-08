import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
	function middleware(req) {
		const token = req.nextauth.token;
		const path = req.nextUrl.pathname;

		// Admin routes
		if (path.startsWith("/admin") || path === "/members" || path.startsWith("/members/")) {
			if (token?.role !== "ADMIN") {
				return NextResponse.rewrite(new URL("/access-denied", req.url));
			}
		}

		// Root redirect
		if (path === "/") {
			if (token?.role === "ADMIN") {
				return NextResponse.redirect(new URL("/admin/dashboard", req.url));
			} else {
				return NextResponse.redirect(new URL("/dashboard", req.url));
			}
		}

		// Account Setup Enforcement
		if (token?.isFirstLogin && path !== "/auth/account-setup") {
			return NextResponse.redirect(new URL("/auth/account-setup", req.url));
		}
		
		if (!token?.isFirstLogin && path === "/auth/account-setup") {
			if (token?.role === "ADMIN") {
				return NextResponse.redirect(new URL("/admin/dashboard", req.url));
			}
			return NextResponse.redirect(new URL("/dashboard", req.url));
		}

		return NextResponse.next();
	},
	{
		callbacks: {
			authorized: ({ token }) => !!token,
		},
		pages: {
			signIn: "/auth/signin",
		},
	},
);

export const config = {
	matcher: [
		"/",
		"/dashboard/:path*",
		"/admin/:path*",
		"/projects/:path*",
		"/members/:path*",
		"/analytics/:path*",
		"/profile/:path*",
		"/settings/:path*",
		"/auth/account-setup",
	],
};

