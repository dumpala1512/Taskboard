import type { Editor } from "@tiptap/react";
import {
	Bold,
	Italic,
	List,
	ListOrdered,
	Redo2,
	Strikethrough,
	Underline,
	Undo2,
} from "lucide-react";
import type React from "react";

interface ToolbarProps {
	editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
	if (!editor) return null;

	const preventFocus = (e: React.MouseEvent) => {
		e.preventDefault();
	};

	return (
		<div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2 text-gray-600 rounded-t-lg select-none">
			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
				className="p-1.5 rounded transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
				title="Undo (Ctrl+Z)"
			>
				<Undo2 className="w-4 h-4" />
			</button>
			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
				className="p-1.5 rounded transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
				title="Redo (Ctrl+Y)"
			>
				<Redo2 className="w-4 h-4" />
			</button>

			<div className="w-px h-5 bg-gray-300 mx-1" />

			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().toggleBold().run()}
				className={`p-1.5 rounded transition-colors ${editor.isActive("bold") ? "bg-gray-300 text-gray-900 font-semibold shadow-inner" : "hover:bg-gray-200"}`}
				title="Bold (Ctrl+B)"
			>
				<Bold className="w-4 h-4" />
			</button>
			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().toggleItalic().run()}
				className={`p-1.5 rounded transition-colors ${editor.isActive("italic") ? "bg-gray-300 text-gray-900 shadow-inner" : "hover:bg-gray-200"}`}
				title="Italic (Ctrl+I)"
			>
				<Italic className="w-4 h-4" />
			</button>
			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				className={`p-1.5 rounded transition-colors ${editor.isActive("underline") ? "bg-gray-300 text-gray-900 shadow-inner" : "hover:bg-gray-200"}`}
				title="Underline (Ctrl+U)"
			>
				<Underline className="w-4 h-4" />
			</button>
			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().toggleStrike().run()}
				className={`p-1.5 rounded transition-colors ${editor.isActive("strike") ? "bg-gray-300 text-gray-900 shadow-inner" : "hover:bg-gray-200"}`}
				title="Strikethrough"
			>
				<Strikethrough className="w-4 h-4" />
			</button>

			<div className="w-px h-5 bg-gray-300 mx-1" />

			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList") ? "bg-gray-300 text-gray-900 shadow-inner" : "hover:bg-gray-200"}`}
				title="Bullet List"
			>
				<List className="w-4 h-4" />
			</button>
			<button
				type="button"
				onMouseDown={preventFocus}
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				className={`p-1.5 rounded transition-colors ${editor.isActive("orderedList") ? "bg-gray-300 text-gray-900 shadow-inner" : "hover:bg-gray-200"}`}
				title="Numbered List"
			>
				<ListOrdered className="w-4 h-4" />
			</button>
		</div>
	);
}
