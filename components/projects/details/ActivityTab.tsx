import React from 'react';
import type { User, Activity as ActivityItem } from '../../../server/types';
import { Clock, MessageSquare, Plus, Edit, CheckCircle2, Trash2, Activity as ActivityIcon } from 'lucide-react';
import { EmptyState } from '../../ui/EmptyState';

interface ActivityTabProps {
  activities: ActivityItem[];
  users: User[];
}

const getActionIcon = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('comment'))                        return <MessageSquare className="w-3.5 h-3.5 text-[#1E88E5]" />;
  if (lowerAction.includes('create'))                        return <Plus className="w-3.5 h-3.5 text-[#43A047]" />;
  if (lowerAction.includes('update') || lowerAction.includes('move')) return <Edit className="w-3.5 h-3.5 text-[#FB8C00]" />;
  if (lowerAction.includes('complete') || lowerAction.includes('done')) return <CheckCircle2 className="w-3.5 h-3.5 text-[#43A047]" />;
  if (lowerAction.includes('delete'))                        return <Trash2 className="w-3.5 h-3.5 text-[#E53935]" />;
  return <Clock className="w-3.5 h-3.5 text-[#9EAAB7]" />;
};

export default function ActivityTab({ activities, users }: ActivityTabProps) {
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="w-full bg-white rounded-md border border-[#E0E3E8] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <h3 className="text-base font-semibold text-[#33475B] mb-5">Project Activity</h3>

      <div className="relative border-l border-[#E0E3E8] ml-3.5 space-y-6">
        {sortedActivities.map(activity => {
          const user = users.find(u => u.id === activity.userId);

          return (
            <div key={activity.id} className="relative pl-5">
              {/* Icon node */}
              <div className="absolute -left-4 top-0.5 w-7 h-7 bg-white border border-[#E0E3E8] rounded-full flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                {getActionIcon(activity.type)}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <span className="text-sm font-semibold text-[#33475B]">{user?.name || 'Unknown User'}</span>
                  <span className="text-sm text-[#6E7B8B] mx-1">{activity.type.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-[#33475B]">{activity.details}</span>
                </div>
                <div className="text-xs text-[#9EAAB7] flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(activity.createdAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {sortedActivities.length === 0 && (
          <div className="flex-1 mt-4">
            <EmptyState 
              icon={ActivityIcon}
              title="No Recent Activity"
              description="It looks quiet here! Activity will appear when team members start interacting with the project and its tasks."
            />
          </div>
        )}
      </div>
    </div>
  );
}
