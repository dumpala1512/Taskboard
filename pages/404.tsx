import { Search } from "lucide-react";
import React from "react";
import { ErrorPageLayout } from "../components/layout/ErrorPageLayout";

export default function Custom404() {
	return (
		<ErrorPageLayout
			title="Page Not Found"
			statusCode="404"
			description="The page you are looking for doesn't exist or has been moved."
			illustration={
				<div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
					<Search className="w-12 h-12 text-slate-400" />
				</div>
			}
			primaryAction={{ label: "Back to Dashboard", href: "/dashboard" }}
		/>
	);
}
