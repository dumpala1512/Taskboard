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

  // Deduplicate users by clean email or id so duplicate rows never appear
  const uniqueUsers: UserDetailed[] = [];
  const seenEmails = new Set<string>();
  const seenIds = new Set<string>();
  for (const u of (users || [])) {
    if (!u) continue;
    const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
    if (cleanEmail) {
      if (seenEmails.has(cleanEmail)) continue;
      seenEmails.add(cleanEmail);
    } else if (u.id) {
      if (seenIds.has(u.id)) continue;
      seenIds.add(u.id);
    }
    uniqueUsers.push(u);
  }

  const filteredUsers = uniqueUsers.filter((u) => {
    if (!u) return false;
    const term = (searchTerm || "").toLowerCase();
    const name = (u.name || (u as any).firstName || u.email || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const dept = (u.department || "").toLowerCase();
    return name.includes(term) || email.includes(term) || dept.includes(term);
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
                filteredUsers.map((user) => {
                  const displayName = user.name || (user as any).firstName || user.email || "Member";
                  return (
                    <tr 
                      key={user.id || Math.random().toString()} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => handleRowClick(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center min-w-0">
                          <img 
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e0e7ff&color=4f46e5`} 
                            alt={displayName} 
                            className="w-10 h-10 rounded-full mr-3 border border-slate-200 shrink-0"
                          />
                          <div className="text-sm font-medium text-slate-900 flex items-center min-w-0 w-full max-w-[200px] sm:max-w-xs">
                            <span className="truncate">{displayName}</span>
                            {user.role === 'ADMIN' && <span title="Admin" className="shrink-0"><Shield className="w-3 h-3 text-indigo-500 ml-1.5" /></span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-xs">{user.email || "—"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{user.jobTitle || user.department || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {user.joiningDate || user.createdAt ? new Date(user.joiningDate || user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })
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
