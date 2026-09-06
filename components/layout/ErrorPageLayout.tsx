import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import type React from "react";

interface ErrorPageLayoutProps {
	title: string;
	statusCode: string;
	description: string;
	illustration?: React.ReactNode;
	primaryAction?: {
		label: string;
		href?: string;
		onClick?: () => void;
		icon?: React.ReactNode;
	};
	secondaryAction?: {
		label: string;
		href?: string;
		onClick?: () => void;
		icon?: React.ReactNode;
	};
}

export function ErrorPageLayout({
	title,
	statusCode,
	description,
	illustration,
	primaryAction,
	secondaryAction,
}: ErrorPageLayoutProps) {
	return (
		<div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
			<Head>
				<title>
					{statusCode} | {title}
				</title>
			</Head>

			<div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#E0E3E8] p-8 text-center">
				{illustration ? (
					<div className="mb-6 flex justify-center">{illustration}</div>
				) : (
					<div className="mb-6 flex justify-center">
						<div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
							<AlertTriangle className="w-12 h-12 text-red-500" />
						</div>
					</div>
				)}

				<h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
					{statusCode}
				</h1>
				<h2 className="text-xl font-bold text-slate-800 mb-3">{title}</h2>
				<p className="text-base text-slate-500 mb-8 max-w-sm mx-auto">
					{description}
				</p>

				<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
					{primaryAction &&
						(primaryAction.href ? (
							<Link
								href={primaryAction.href}
								className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
							>
								{primaryAction.icon || <Home className="w-4 h-4 mr-2" />}
								{primaryAction.label}
							</Link>
						) : (
							<button
								onClick={primaryAction.onClick}
								className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
							>
								{primaryAction.icon || <RefreshCw className="w-4 h-4 mr-2" />}
								{primaryAction.label}
							</button>
						))}

					{secondaryAction &&
						(secondaryAction.href ? (
							<Link
								href={secondaryAction.href}
								className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
							>
								{secondaryAction.icon || <ArrowLeft className="w-4 h-4 mr-2" />}
								{secondaryAction.label}
							</Link>
						) : (
							<button
								onClick={secondaryAction.onClick}
								className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
							>
								{secondaryAction.icon || <ArrowLeft className="w-4 h-4 mr-2" />}
								{secondaryAction.label}
							</button>
						))}
				</div>
			</div>
		</div>
	);
}
