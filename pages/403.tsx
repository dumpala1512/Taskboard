import { ArrowLeft, Home, Lock } from "lucide-react";
import { useRouter } from "next/router";
import React from "react";
import { ErrorPageLayout } from "../components/layout/ErrorPageLayout";

export default function Custom403() {
	const router = useRouter();

	return (
		<ErrorPageLayout
			title="Access Denied"
			statusCode="403"
			description="You don't have permission to access this resource."
			illustration={
				<div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
					<Lock className="w-12 h-12 text-red-500" />
				</div>
			}
			primaryAction={{
				label: "Go Back",
				onClick: () => router.back(),
				icon: <ArrowLeft className="w-4 h-4 mr-2" />,
			}}
			secondaryAction={{
				label: "Dashboard",
				href: "/dashboard",
				icon: <Home className="w-4 h-4 mr-2" />,
			}}
		/>
	);
}
