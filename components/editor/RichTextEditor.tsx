import CharacterCount from "@tiptap/extension-character-count";
import { FontFamily } from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useEffect } from "react";
import { Toolbar } from "./Toolbar";

interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	className?: string;
	error?: boolean;
	maxLength?: number;
	readOnly?: boolean;
}

export default function RichTextEditor({
	value,
	onChange,
	onBlur,
	placeholder = "Write something...",
	className = "",
	error,
	maxLength,
	readOnly = false,
}: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Underline,
			Highlight,
			Link.configure({ openOnClick: false }),
			Image,
			Table.configure({ resizable: true }),
			TableRow,
			TableHeader,
			TableCell,
			TaskList,
			TaskItem.configure({ nested: true }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Placeholder.configure({ placeholder }),
			TextStyle,
			FontFamily,
			...(maxLength ? [CharacterCount.configure({ limit: maxLength })] : []),
		],
		content: value,
		editable: !readOnly,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		onBlur: () => {
			onBlur?.();
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-gray-900",
			},
		},
	});

	// Update content if value changes externally
	useEffect(() => {
		if (editor) {
			const currentHTML = editor.getHTML();
			const targetHTML = value || "";
			if (!targetHTML && currentHTML !== "<p></p>" && currentHTML !== "") {
				editor.commands.setContent("", { emitUpdate: false });
			} else if (targetHTML && targetHTML !== currentHTML) {
				editor.commands.setContent(targetHTML, { emitUpdate: false });
			}
		}
	}, [value, editor]);

	if (!editor) {
		return (
			<div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[150px] animate-pulse">
				<span className="text-gray-400">Loading editor...</span>
			</div>
		);
	}

	return (
		<div
			className={`border rounded-lg overflow-hidden bg-white flex flex-col focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow ${error ? "border-red-500" : "border-gray-300"} ${className}`}
		>
			{!readOnly && <Toolbar editor={editor} />}
			<div className="flex-1 overflow-y-auto min-h-[150px] max-h-[500px]">
				<EditorContent editor={editor} />
			</div>
			{maxLength && (
				<div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 text-right border-t border-gray-200">
					{editor.storage.characterCount.characters()} / {maxLength} characters
				</div>
			)}
		</div>
	);
}
