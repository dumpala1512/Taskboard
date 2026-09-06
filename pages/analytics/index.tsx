import React, { useEffect, useState } from "react";
import Head from "next/head";
import { AppLayout } from "../../components/layout/AppLayout";
import { useSession } from "next-auth/react";
import { 
  Folder, 
  Activity, 
  CheckCircle, 
  ClipboardList, 
  AlertTriangle, 
  Users, 
  PieChart as PieChartIcon, 
  TrendingUp,
  RefreshCw,
  Download,
  Filter,
  BarChart2
} from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import axios from "axios";

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'my'>('all');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/analytics?filter=${filter}`);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, filter]);

  const COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#6b7280"];
  const PRIORITY_COLORS = {
    "Critical": "#ef4444",
    "High": "#f97316",
    "Medium": "#eab308",
    "Low": "#6b7280"
  };

  const STATUS_COLORS = {
    "Todo": "#6b7280",
    "In Progress": "#3b82f6",
    "Review": "#f59e0b",
    "Done": "#10b981"
  };

  return (
    <AppLayout>
      <Head>
        <title>Analytics & Reports | Capstone</title>
      </Head>

      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">
              Last Updated: {loading ? "Loading..." : "Just now"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'my')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <option value="all">Workspace Analytics</option>
              <option value="my">My Analytics</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAnalytics} className="text-sm font-medium underline">Retry</button>
          </div>
        )}

        {loading && !data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={`kpi-skeleton-${i}`} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {[1, 2].map(i => (
                <div key={`chart-skeleton-${i}`} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-72 flex flex-col">
                  <Skeleton className="h-6 w-48 mb-6" />
                  <div className="flex-1 flex justify-center items-center">
                    <Skeleton className="w-40 h-40 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Total Projects" value={data.kpi.totalProjects} icon={<Folder />} />
              <KpiCard title="Active Projects" value={data.kpi.activeProjects} icon={<Activity />} />
              <KpiCard title="Completed Tasks" value={data.kpi.completedTasks} icon={<CheckCircle />} />
              <KpiCard title="Overdue Tasks" value={data.kpi.overdueTasks} icon={<AlertTriangle />} textClass="text-red-600" />
              <KpiCard title="Active Members" value={data.kpi.activeMembers} icon={<Users />} />
              <KpiCard title="Completion Rate" value={`${data.kpi.completionRate}%`} icon={<PieChartIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Status Distribution */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Task Status Distribution</h3>
                <div className="h-64">
                  {data.taskStatusDistribution.filter((d: any) => d.value > 0).length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <EmptyState 
                        icon={PieChartIcon} 
                        title="No Status Data" 
                        description="There are no tasks available to show status distribution." 
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.taskStatusDistribution.filter((d: any) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={data.taskStatusDistribution.filter((d: any) => d.value > 0).length > 1 ? 2 : 0}
                          dataKey="value"
                        >
                          {data.taskStatusDistribution.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} 
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: "8px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                          itemStyle={{ color: "#0f172a", fontWeight: 500 }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Distribution</h3>
                <div className="h-64">
                  {data.priorityDistribution.filter((d: any) => d.value > 0).length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <EmptyState 
                        icon={PieChartIcon} 
                        title="No Priority Data" 
                        description="There are no tasks available to show priority distribution." 
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.priorityDistribution.filter((d: any) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={data.priorityDistribution.filter((d: any) => d.value > 0).length > 1 ? 2 : 0}
                          dataKey="value"
                        >
                          {data.priorityDistribution.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || COLORS[index % COLORS.length]} 
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: "8px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                          itemStyle={{ color: "#0f172a", fontWeight: 500 }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Task Completion Trend */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Task Completion Trend (Last 7 Days)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.taskCompletionTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Workload Distribution */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Workload Distribution</h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.workloadDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      barSize={50}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="memberName" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                      <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            <div className="mt-6">
              {/* Member Performance */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Member Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.workloadDistribution?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-0 border-b-0">
                            <EmptyState 
                              icon={Users}
                              title="No member data"
                              description="There is no workload data to display for any members."
                            />
                          </td>
                        </tr>
                      ) : (
                        data.workloadDistribution?.map((member: any) => (
                          <tr key={member.memberId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.memberName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.assigned}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.completed}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">{member.overdue > 0 ? member.overdue : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

function KpiCard({ title, value, icon, textClass = "text-gray-900" }: { title: string, value: string | number, icon: React.ReactNode, textClass?: string }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
      <div className="p-3 rounded-full bg-blue-50 text-blue-600">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
      </div>
    </div>
  );
}
