import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { AppLayout } from "../../components/layout/AppLayout";
import { useSession } from "next-auth/react";
import { 
  Folder, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  PieChart as PieChartIcon, 
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
import { apiClient } from "../../lib/axios";
import { useTheme } from "../../context/ThemeContext";

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string; key?: string }[]>([]);

  const tooltipContentStyle = {
    backgroundColor: isDark ? "#131B2E" : "#ffffff",
    borderColor: isDark ? "#222F49" : "#e2e8f0",
    borderRadius: "8px",
    boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.5)" : "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    color: isDark ? "#F8FAFC" : "#0f172a",
  };

  const tooltipItemStyle = {
    color: isDark ? "#F8FAFC" : "#0f172a",
    fontWeight: 500,
  };

  const effectiveFilter = isAdmin ? filter : 'my';

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("filter", effectiveFilter);
      if (selectedProjectId && selectedProjectId !== "all") {
        params.append("projectId", selectedProjectId);
      }
      const res = await apiClient.get(`/analytics?${params.toString()}`);
      setData(res.data);
      if (res.data?.projectsList && res.data.projectsList.length > 0) {
        setAvailableProjects(res.data.projectsList);
      }
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
  }, [session, effectiveFilter, selectedProjectId, router.asPath]);

  useEffect(() => {
    const handleFocus = () => {
      if (session) fetchAnalytics();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);
    const interval = setInterval(() => {
      if (session) fetchAnalytics();
    }, 15000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
      clearInterval(interval);
    };
  }, [session, effectiveFilter, selectedProjectId]);

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

  const currentProjectName = availableProjects.find((p) => p.id === selectedProjectId || p.key === selectedProjectId)?.name;

  return (
    <AppLayout>
      <Head>
        <title>{isAdmin ? "Analytics & Reports" : "My Analytics"} | Capstone</title>
      </Head>

      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {isAdmin ? (filter === "all" ? "Workspace Analytics" : "My Analytics") : "My Analytics"}
              </h1>
              {selectedProjectId !== "all" && currentProjectName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Folder className="w-3 h-3" />
                  {currentProjectName}
                  <button
                    onClick={() => setSelectedProjectId("all")}
                    className="ml-1 hover:text-blue-950 dark:hover:text-white font-bold"
                    title="Clear project filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Last Updated: {loading ? "Loading..." : "Just now"}
              {selectedProjectId !== "all" && currentProjectName && ` • Filtered by ${currentProjectName}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter Dropdown */}
            <select
              id="analytics-project-filter"
              aria-label="Filter by project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-48 sm:w-52 px-3 py-2 bg-white dark:bg-[#131B2E] border border-gray-300 dark:border-[#222F49] rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1B2640] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 truncate"
            >
              <option value="all">All Projects</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.key ? `(${p.key})` : ""}
                </option>
              ))}
            </select>

            {isAdmin ? (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'my')}
                className="w-48 sm:w-52 px-3 py-2 bg-white dark:bg-[#131B2E] border border-gray-300 dark:border-[#222F49] rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1B2640] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 truncate"
              >
                <option value="all">Workspace Analytics</option>
                <option value="my">My Analytics</option>
              </select>
            ) : (
              <span className="w-48 sm:w-52 text-center px-3 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-md text-xs font-semibold border border-blue-200 dark:border-blue-800">
                Personal Analytics
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-md flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAnalytics} className="text-sm font-medium underline">Retry</button>
          </div>
        )}

        {loading && !data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={`kpi-skeleton-${i}`} className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm flex items-center space-x-4">
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
                <div key={`chart-skeleton-${i}`} className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm h-72 flex flex-col">
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
              <KpiCard title="Overdue Tasks" value={data.kpi.overdueTasks} icon={<AlertTriangle />} textClass="text-red-600 dark:text-red-400" />
              <KpiCard title="Active Members" value={data.kpi.activeMembers} icon={<Users />} />
              <KpiCard title="Completion Rate" value={`${data.kpi.completionRate}%`} icon={<PieChartIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Task Status Distribution */}
              <div className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Task Status Distribution</h3>
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
                          contentStyle={tooltipContentStyle}
                          itemStyle={tooltipItemStyle}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                          formatter={(value) => <span className="text-slate-600 dark:text-slate-200 font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Priority Distribution</h3>
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
                          contentStyle={tooltipContentStyle}
                          itemStyle={tooltipItemStyle}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                          formatter={(value) => <span className="text-slate-600 dark:text-slate-200 font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Task Completion Trend */}
              <div className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Task Completion Trend (Last 7 Days)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.taskCompletionTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#222F49" : "#e2e8f0"} />
                      <XAxis dataKey="date" stroke={isDark ? "#94A3B8" : "#64748b"} tick={{ fill: isDark ? "#94A3B8" : "#64748b" }} />
                      <YAxis allowDecimals={false} stroke={isDark ? "#94A3B8" : "#64748b"} tick={{ fill: isDark ? "#94A3B8" : "#64748b" }} />
                      <Tooltip contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} />
                      <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Workload Distribution */}
              <div className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Workload Distribution</h3>
                <div className="h-96">
                  {data.workloadDistribution?.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <EmptyState 
                        icon={Users} 
                        title="No Workload Data" 
                        description="There is no workload data to display for any members." 
                      />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.workloadDistribution}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        barSize={50}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#222F49" : "#e2e8f0"} />
                        <XAxis dataKey="memberName" stroke={isDark ? "#94A3B8" : "#64748b"} tick={{ fontSize: 12, fill: isDark ? "#94A3B8" : "#64748b" }} />
                        <YAxis allowDecimals={false} stroke={isDark ? "#94A3B8" : "#64748b"} tick={{ fill: isDark ? "#94A3B8" : "#64748b" }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: isDark ? "#94A3B8" : "#64748b" } }} />
                        <Tooltip 
                          contentStyle={tooltipContentStyle} 
                          itemStyle={tooltipItemStyle} 
                          cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }} 
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }} 
                          formatter={(value) => <span className="text-slate-600 dark:text-slate-200 font-medium">{value}</span>}
                        />
                        <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            <div className="mt-6">
              {/* Member Performance */}
              <div className="bg-white dark:bg-[#131B2E] rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-[#222F49]">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Member Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-[#222F49]">
                    <thead className="bg-gray-50 dark:bg-[#0B1120]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Assigned</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Completed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#131B2E] divide-y divide-gray-200 dark:divide-[#222F49]">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">{member.memberName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{member.assigned}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400 font-medium">{member.completed}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 dark:text-red-400 font-medium">{member.overdue > 0 ? member.overdue : '-'}</td>
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

function KpiCard({ title, value, icon, textClass = "text-gray-900 dark:text-slate-100" }: { title: string, value: string | number, icon: React.ReactNode, textClass?: string }) {
  return (
    <div className="bg-white dark:bg-[#131B2E] p-6 rounded-lg border border-gray-200 dark:border-[#222F49] shadow-sm flex items-center space-x-4">
      <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</p>
        <p className={`text-2xl font-bold ${textClass}`}>{value}</p>
      </div>
    </div>
  );
}
