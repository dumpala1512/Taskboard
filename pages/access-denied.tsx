import { useSession } from "next-auth/react";
import { AppLayout } from "../components/layout/AppLayout";

export default function AccessDenied() {
	const { data: session } = useSession();

	return (
		<AppLayout>
			<div className="max-w-3xl mx-auto mt-16 text-center">
				<div className="bg-red-50 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
					<svg
						className="w-12 h-12"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
				<p className="text-gray-500 mb-8">
					You do not have permission to view this page. This area is restricted
					to Administrators only. Your current role is{" "}
					<strong className="text-gray-700">
						{(session?.user as any)?.role || "MEMBER"}
					</strong>
					.
				</p>
				<button
					onClick={() => window.history.back()}
					className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
				>
					Go Back
				</button>
			</div>
		</AppLayout>
	);
}
