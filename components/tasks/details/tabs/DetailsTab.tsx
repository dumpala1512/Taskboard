import React, { useState } from 'react';
import { User, AlignLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

import type { Task, User as UserType } from '../../../../server/types';

interface DetailsTabProps {
  task?: Task | null;
  users?: UserType[];
  project?: any;
  onAssign?: (userId: string | null) => void;
}

export function DetailsTab({ task, users = [], project, onAssign }: DetailsTabProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [isAssigning, setIsAssigning] = useState(false);

  return (
    <div className="space-y-8">
      {/* Description Section */}
      <section>
        <div className="flex items-center space-x-2 mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">
          <AlignLeft className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          <h3>Description</h3>
        </div>
        <div 
          className="bg-gray-50 dark:bg-[#1A233A] rounded-lg p-4 text-gray-700 dark:text-slate-200 text-sm prose prose-sm max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: task?.description || '<p className="text-gray-500 italic">No description provided.</p>' }}
        />
      </section>

      {/* Assignment Info Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm relative">
          <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Assignee
          </h4>
          <div className="flex items-center space-x-3">
            {task?.assigneeId ? (
              <>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                  {users.find(u => u.id === task.assigneeId)?.name.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{users.find(u => u.id === task.assigneeId)?.name || 'Unknown User'}</p>
                  {isAdmin && (
                    <div className="flex space-x-2 mt-0.5">
                      <button onClick={() => setIsAssigning(!isAssigning)} className="text-xs text-blue-600 hover:underline">Change</button>
                      <span className="text-xs text-gray-300">|</span>
                      <button onClick={() => { onAssign?.(null); setIsAssigning(false); }} className="text-xs text-gray-500 hover:text-red-600 hover:underline">Remove</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm">
                  ?
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Unassigned</p>
                  {isAdmin && (
                    <button onClick={() => setIsAssigning(!isAssigning)} className="text-xs text-blue-600 hover:underline">Assign to user</button>
                  )}
                </div>
              </>
            )}
          </div>
          
          {isAssigning && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-10 p-2">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Select User</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {users.map(user => {
                  const isMember =
                    !project ||
                    project.ownerId === user.id ||
                    (Array.isArray(project.members) && project.members.includes(user.id));
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (project && !isMember) {
                          toast.error("Add the member to the project and then assign task");
                          return;
                        }
                        onAssign?.(user.id);
                        setIsAssigning(false);
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded-md text-sm text-gray-700 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span>{user.name}</span>
                      </div>
                      {!isMember && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Not in project
                        </span>
                      )}
                    </button>
                  );
                })}
                {users.length === 0 && (
                  <div className="text-xs text-gray-500 px-2 py-1">No users found.</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Reporter
          </h4>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm">
              -
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">No Reporter</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
