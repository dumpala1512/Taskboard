import React, { useState } from 'react';
import { User, AlignLeft, CheckSquare, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSession } from 'next-auth/react';

import type { Task, User as UserType } from '../../../../server/types';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface DetailsTabProps {
  task?: Task | null;
  users?: UserType[];
  onAssign?: (userId: string | null) => void;
}

export function DetailsTab({ task, users = [], onAssign }: DetailsTabProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), text: newItemText.trim(), completed: false }
    ]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Description Section */}
      <section>
        <div className="flex items-center space-x-2 mb-3 text-lg font-semibold text-gray-900">
          <AlignLeft className="w-5 h-5 text-gray-500" />
          <h3>Description</h3>
        </div>
        <div 
          className="bg-gray-50 rounded-lg p-4 text-gray-700 text-sm prose prose-sm max-w-none break-words"
          dangerouslySetInnerHTML={{ __html: task?.description || '<p className="text-gray-500 italic">No description provided.</p>' }}
        />
      </section>

      {/* Checklist Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
            <CheckSquare className="w-5 h-5 text-gray-500" />
            <h3>Checklist</h3>
          </div>
          <span className="text-sm text-gray-500">
            {checklist.filter(i => i.completed).length} / {checklist.length} completed
          </span>
        </div>
        
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-1">
            {checklist.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center group p-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <GripVertical className="w-4 h-4 text-gray-300 mr-2 cursor-grab opacity-0 group-hover:opacity-100" />
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleItem(item.id)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className={`ml-3 flex-1 text-sm ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {item.text}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-3 border-t bg-gray-50 rounded-b-lg">
            <form onSubmit={handleAddItem} className="flex space-x-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Add an item..."
                maxLength={100}
                className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!newItemText.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </form>
          </div>
        </div>
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
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onAssign?.(user.id);
                      setIsAssigning(false);
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded-md text-sm text-gray-700 flex items-center space-x-2"
                  >
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <span>{user.name}</span>
                  </button>
                ))}
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
