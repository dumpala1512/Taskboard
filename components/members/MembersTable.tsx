import React, { useState } from 'react';
import { UserDetailed } from '../../hooks/useUsers';
import { MoreHorizontal, Shield, Users } from 'lucide-react';
import MemberProfileDrawer from './MemberProfileDrawer';
import { EmptyState } from '../ui/EmptyState';

interface MembersTableProps {
  users: UserDetailed[];
  searchTerm: string;
}

export default function MembersTable({ users, searchTerm }: MembersTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserDetailed | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term)
    );
  });

  const handleRowClick = (user: UserDetailed) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Name Of The Member</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Joining Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0 border-b-0">
                    <EmptyState 
                      icon={Users}
                      title="No members found"
                      description={searchTerm ? "Try adjusting your search to find a team member." : "Invite members to your team to get started."}
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center min-w-0">
                        <img 
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e0e7ff&color=4f46e5`} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full mr-3 border border-slate-200 shrink-0"
                        />
                        <div className="text-sm font-medium text-slate-900 flex items-center min-w-0 w-full max-w-[200px] sm:max-w-xs">
                          <span className="truncate">{user.name}</span>
                          {user.role === 'ADMIN' && <span title="Admin" className="shrink-0"><Shield className="w-3 h-3 text-indigo-500 ml-1.5" /></span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-xs">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{user.jobTitle || user.department || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {user.joiningDate || user.createdAt ? new Date(user.joiningDate || user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MemberProfileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        user={selectedUser} 
      />
    </>
  );
}
