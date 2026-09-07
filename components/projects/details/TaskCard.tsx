import React from 'react';
import type { Task, User } from '../../../server/types';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, Paperclip, MessageSquare, Flag, Edit2, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  users: User[];
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const PRIORITY_CONFIG: Record<
  Task['priority'],
  { text: string; bg: string; className: string }
> = {
  HIGH: {
    text: '#FB8C00',
    bg: '#FFF3E0',
    className:
      'text-[#FB8C00] bg-[#FFF3E0] dark:text-[#FBBF24] dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/40',
  },
  MEDIUM: {
    text: '#2196F3',
    bg: '#E3F2FD',
    className:
      'text-[#2196F3] bg-[#E3F2FD] dark:text-[#38BDF8] dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/40',
  },
  LOW: {
    text: '#43A047',
    bg: '#E8F5E9',
    className:
      'text-[#43A047] bg-[#E8F5E9] dark:text-[#4ADE80] dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40',
  },
};

export default function TaskCard({ task, index, users, onClick, onEdit, onDelete }: TaskCardProps) {
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.LOW;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick && onClick(task)}
          className={`bg-white dark:bg-[#131B2E] rounded border cursor-grab active:cursor-grabbing transition-all duration-150 mb-[9px] group min-h-[120px] h-auto flex flex-col ${
            snapshot.isDragging
              ? 'border-[#1E88E5] dark:border-sky-500 shadow-[0_4px_14px_rgba(30,136,229,0.18)] z-50'
              : 'border-[#E0E3E8] dark:border-[#222F49] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.40)] hover:border-[#90CAF9] dark:hover:border-sky-600'
          }`}
          style={{ ...provided.draggableProps.style, padding: '10px 12px' }}
        >
          {/* Priority badge + Assignees & Edit/Delete */}
          <div className="flex justify-between items-start mb-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-sm ${pCfg.className}`}
            >
              <Flag className="w-2.5 h-2.5" />
              {task.priority}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(task);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Edit Task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex -space-x-1.5 ml-1">
                {task.assignees?.map(assigneeId => {
                  const u = users.find(user => user.id === assigneeId);
                  return u ? (
                    <img
                      key={u.id}
                      src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32&background=E3F2FD&color=1E88E5`}
                      alt={u.name}
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-[#131B2E] object-cover"
                      title={u.name}
                    />
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-[#33475B] dark:text-slate-100 mb-2 leading-snug break-words">
            {task.title}
          </h4>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5 overflow-hidden">
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-[#F0F4FF] dark:bg-indigo-950/50 text-[#1E88E5] dark:text-indigo-300 rounded-full border border-[#BBDEFB] dark:border-indigo-800 break-all max-w-full inline-block"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between text-xs text-[#9EAAB7] dark:text-slate-400 mt-2 pt-2 border-t border-[#EEF0F3] dark:border-[#222F49]">
            <div className="flex items-center space-x-2.5">
              {task.dueDate && (
                <div className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-[#E53935] dark:text-red-400' : 'text-[#9EAAB7] dark:text-slate-400'}`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {((task as any).attachments ?? 0) > 0 && (
                <div className="flex items-center gap-0.5">
                  <Paperclip className="w-3 h-3" /> {(task as any).attachments}
                </div>
              )}
              {((task as any).comments ?? 0) > 0 && (
                <div className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" /> {(task as any).comments}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
