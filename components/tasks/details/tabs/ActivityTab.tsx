import React from 'react';
import { Activity, Plus, FileText, CheckSquare, MessageSquare, CornerDownRight } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_ACTIVITY: any[] = [];

export function ActivityTab() {
  if (MOCK_ACTIVITY.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4 text-center">
        <div className="p-4 bg-gray-50 rounded-full">
          <Activity className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">No activity yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Changes to this task will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-6">
        <Activity className="w-5 h-5 text-gray-500" />
        <h3>Activity Timeline</h3>
      </div>

      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {MOCK_ACTIVITY.map((event, eventIdx) => (
            <li key={event.id}>
              <div className="relative pb-8">
                {eventIdx !== MOCK_ACTIVITY.length - 1 ? (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${event.iconBg}`}>
                      <event.icon className={`h-4 w-4 ${event.iconColor}`} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{event.user}</span>{' '}
                        {event.action}{' '}
                        {event.target && (
                          <span className="font-medium text-gray-900">{event.target}</span>
                        )}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-gray-500">
                      <time dateTime={event.timestamp.toISOString()}>
                        {format(event.timestamp, 'MMM d, h:mm a')}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
