import React from 'react';
import type { Task, User } from '../../../server/types';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, Paperclip, MessageSquare, Flag, Edit2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  users: User[];
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
}

const PRIORITY_CONFIG: Record<Task['priority'], { text: string; bg: string; dot: string }> = {
  HIGH:     { text: '#FB8C00', bg: '#FFF3E0', dot: '#FB8C00' },
  MEDIUM:   { text: '#2196F3', bg: '#E3F2FD', dot: '#2196F3' },
  LOW:      { text: '#43A047', bg: '#E8F5E9', dot: '#43A047' },
};

export default function TaskCard({ task, index, users, onClick, onEdit }: TaskCardProps) {
  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.LOW;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick && onClick(task)}
          className={`bg-white rounded border cursor-grab active:cursor-grabbing transition-all duration-150 mb-[9px] group min-h-[120px] h-auto flex flex-col ${
            snapshot.isDragging
              ? 'border-[#1E88E5] shadow-[0_4px_14px_rgba(30,136,229,0.18)] z-50'
              : 'border-[#E0E3E8] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:border-[#90CAF9]'
          }`}
          style={{ ...provided.draggableProps.style, padding: '10px 12px' }}
        >
          {/* Priority badge + Assignees & Edit */}
          <div className="flex justify-between items-start mb-2">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-sm"
              style={{ color: pCfg.text, background: pCfg.bg }}
            >
              <Flag className="w-2.5 h-2.5" />
              {task.priority}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(task);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 p-0.5"
                title="Edit Task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex -space-x-1.5">
                {task.assignees?.map(assigneeId => {
                  const u = users.find(user => user.id === assigneeId);
                  return u ? (
                    <img
                      key={u.id}
                      src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32&background=E3F2FD&color=1E88E5`}
                      alt={u.name}
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                      title={u.name}
                    />
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-[#33475B] mb-2 leading-snug break-words">
            {task.title}
          </h4>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-[#F0F4FF] text-[#1E88E5] rounded-full border border-[#BBDEFB]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between text-xs text-[#9EAAB7] mt-2 pt-2 border-t border-[#EEF0F3]">
            <div className="flex items-center space-x-2.5">
              {task.dueDate && (
                <div className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-[#E53935]' : 'text-[#9EAAB7]'}`}>
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
