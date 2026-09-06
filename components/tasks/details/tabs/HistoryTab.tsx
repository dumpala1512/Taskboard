import React from 'react';
import { History as HistoryIcon, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_HISTORY: any[] = [];

export function HistoryTab() {
  if (MOCK_HISTORY.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4">
          <HistoryIcon className="w-5 h-5 text-gray-500" />
          <h3>Audit Log</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4 text-center border rounded-lg bg-gray-50 border-dashed">
          <div className="p-4 bg-white rounded-full shadow-sm">
            <HistoryIcon className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">No history available</h3>
            <p className="mt-1 text-xs text-gray-500">
              Changes made to this task will be logged here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-4">
        <HistoryIcon className="w-5 h-5 text-gray-500" />
        <h3>Audit Log</h3>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field Changed
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Old Value
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New Value
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changed By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {MOCK_HISTORY.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.field}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 line-through">
                    {log.oldValue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <ArrowRight className="w-3 h-3 text-gray-400 mr-2" />
                      {log.newValue}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.changedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(log.timestamp, 'MMM d, yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
