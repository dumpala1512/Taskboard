import { Home, LogIn, ShieldAlert } from "lucide-react";
import { signIn } from "next-auth/react";
import React from "react";
import { ErrorPageLayout } from "../components/layout/ErrorPageLayout";

export default function Custom401() {
	return (
		<ErrorPageLayout
			title="Unauthorized"
			statusCode="401"
			description="You need to be logged in to access this page."
			illustration={
				<div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center">
					<ShieldAlert className="w-12 h-12 text-amber-500" />
				</div>
			}
			primaryAction={{
				label: "Login",
				onClick: () => signIn(),
				icon: <LogIn className="w-4 h-4 mr-2" />,
			}}
			secondaryAction={{
				label: "Back Home",
				href: "/",
				icon: <Home className="w-4 h-4 mr-2" />,
			}}
		/>
	);
}
