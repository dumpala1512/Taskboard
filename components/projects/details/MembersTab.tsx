import React from 'react';
import type { User, Task } from '../../../server/types';
import { Mail, CheckCircle2, ListTodo, Shield, User as UserIcon } from 'lucide-react';

interface MembersTabProps {
  users: User[];
  tasks: Task[];
}

export default function MembersTab({ users, tasks }: MembersTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map(user => {
        const userTasks = tasks.filter(t => t.assigneeId === user.id || t.assignees?.includes(user.id));
        const completedTasks = userTasks.filter(t => t.status === 'DONE').length;
        const completionPct = userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0;

        return (
          <div key={user.id} className="bg-white rounded-md border border-[#E0E3E8] p-5 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border border-[#E0E3E8] object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#1E88E5] font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-semibold text-[#33475B]">{user.name}</h3>
                  <div className="flex items-center text-xs text-[#9EAAB7] mt-0.5 gap-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
              </div>

              <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm flex items-center gap-1 ${
                user.role === 'ADMIN'
                  ? 'bg-[#EDE7F6] text-[#7B61FF]'
                  : 'bg-[#F5F6F8] text-[#6E7B8B]'
              }`}>
                {user.role === 'ADMIN' && <Shield className="w-2.5 h-2.5" />}
                {user.role}
              </span>
            </div>

            {/* Stats */}
            <div className="mt-auto pt-3.5 border-t border-[#EEF0F3] grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-[#9EAAB7] mb-1 flex items-center gap-1">
                  <ListTodo className="w-3 h-3" /> Assigned
                </span>
                <span className="text-xl font-bold text-[#33475B]">{userTasks.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#9EAAB7] mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
                <span className="text-xl font-bold text-[#43A047]">{completedTasks}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-[#F0F2F5] rounded-full h-1">
              <div
                className="bg-[#1E88E5] h-1 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
