import React, { useMemo, useState } from "react";
import { useUsers } from "../../../hooks/useUsers";
import { useProjects } from "../../../hooks/useProjects";
import type { TaskTag } from "../../../server/types";

interface Step3Props {
	formData: any;
	setFormData: (data: any) => void;
	errors: Record<string, string>;
}

const AVAILABLE_TAGS: string[] = ["UI", "BACKEND", "API", "BUG", "FEATURE", "DOCUMENTATION"];

export function Step3Details({ formData, setFormData, errors }: Step3Props) {
	const { data: users = [] } = useUsers();
	const { data: projects = [] } = useProjects();
	const [customTag, setCustomTag] = useState("");

	const projectMembers = useMemo(() => {
		if (!formData.projectId) return [];
		const project = projects.find(p => p.id === formData.projectId);
		if (!project) return [];
		return users.filter(u => project.members?.includes(u.id));
	}, [formData.projectId, projects, users]);

	const toggleTag = (tag: string) => {
		const tags = formData.tags || [];
		if (tags.includes(tag)) {
			setFormData({ ...formData, tags: tags.filter((t: string) => t !== tag) });
		} else {
			if (tags.length >= 20) return;
			setFormData({ ...formData, tags: [...tags, tag] });
		}
	};

	const handleAddCustomTag = () => {
		const tag = customTag.trim().toUpperCase();
		if (tag) {
			const tags = formData.tags || [];
			if (!tags.includes(tag) && tags.length < 20) {
				setFormData({ ...formData, tags: [...tags, tag] });
			}
			setCustomTag("");
		}
	};



	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<label className="text-sm font-medium text-slate-700">Tags (Max 20)</label>
				<div className="flex flex-wrap gap-2 mb-3">
					{AVAILABLE_TAGS.map(tag => (
						<button
							key={tag}
							type="button"
							onClick={() => toggleTag(tag)}
							className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
								${(formData.tags || []).includes(tag) 
									? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
									: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
						>
							{tag}
						</button>
					))}
					{(formData.tags || []).filter((t: string) => !AVAILABLE_TAGS.includes(t)).map((tag: string) => (
						<button
							key={tag}
							type="button"
							onClick={() => toggleTag(tag)}
							className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-indigo-100 text-indigo-700 border-indigo-200"
						>
							{tag}
						</button>
					))}
				</div>
				<div className="flex gap-2">
					<input 
						type="text" 
						value={customTag}
						onChange={(e) => setCustomTag(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleAddCustomTag();
							}
						}}
						placeholder="Add custom tag..." 
						className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-200 bg-white"
					/>
					<button
						type="button"
						onClick={handleAddCustomTag}
						disabled={customTag.trim().length < 2}
						className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
							customTag.trim().length < 2 
								? 'bg-indigo-300 text-white cursor-not-allowed' 
								: 'bg-indigo-600 text-white hover:bg-indigo-700'
						}`}
					>
						Add
					</button>
				</div>
			</div>


		</div>
	);
}
