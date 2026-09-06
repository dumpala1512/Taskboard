import React, { useState } from "react";
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppLayout } from '../../components/layout/AppLayout';
import ProjectHeader from '../../components/projects/details/ProjectHeader';
import OverviewCards from '../../components/projects/details/OverviewCards';
import KanbanBoard from '../../components/projects/details/KanbanBoard';
import OverviewTab from '../../components/projects/details/OverviewTab';
import MembersTab from '../../components/projects/details/MembersTab';
import ActivityTab from '../../components/projects/details/ActivityTab';
import { useProject } from '../../hooks/useProjects';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { useSession } from 'next-auth/react';
import Custom404 from '../404';
import { EmptyState } from '../../components/ui/EmptyState';
import { Users, ListTodo } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { TaskWizardModal } from '../../components/tasks/TaskWizardModal';
import { toast } from 'react-hot-toast';

export default function ProjectDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'members' | 'activity' | 'unassigned' | 'backlog'>('overview');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const { data: project, isLoading: isProjectLoading, error: projectError } = useProject(id as string);
  const { data: tasks, isLoading: isTasksLoading } = useTasks(id as string);
  const { data: users, isLoading: isUsersLoading } = useUsers();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const updateTask = useUpdateTask();
  const safeTasks = tasks || [];
  const safeUsers = users || [];

  const projectMembers = React.useMemo(() => {
    if (!project) return [];
    return safeUsers.filter(
      (u: any) => u.id === project.ownerId || project.members?.includes(u.id)
    );
  }, [project, safeUsers]);

  const projectColumns = React.useMemo(() => {
    const defaultCols = [
      { id: "TODO", title: "To Do" },
      { id: "IN_PROGRESS", title: "In Progress" },
      { id: "REVIEW", title: "Review" },
      { id: "DONE", title: "Done" },
    ];
    return (project?.columns && project.columns.length > 0 ? project.columns : defaultCols).filter(
      (c: any) => c.id !== "BACKLOG"
    );
  }, [project?.columns]);

  if (!router.isReady || isProjectLoading || isUsersLoading || (!project && !projectError)) return (
    <AppLayout>
      <div className="flex flex-col h-full bg-slate-50">
        <div className="px-6 py-4 border-b border-slate-200">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="w-full space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>

            <div className="flex space-x-6 border-b border-slate-200 pb-3 mt-8">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-5 w-20" />
              ))}
            </div>

            <Skeleton className="h-64 w-full rounded-xl mt-6" />
          </div>
        </div>
      </div>
    </AppLayout>
  );

  if (projectError || !project) return <Custom404 />;

  return (
    <AppLayout>
      <Head>
        <title>{project.name} | Projects Workspace</title>
      </Head>

      <div className="flex flex-col h-full bg-slate-50">
        {/* Breadcrumb Area */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="text-sm text-slate-500 flex items-center">
            Projects <span className="mx-2">&gt;</span> <span className="font-medium text-slate-900 truncate max-w-xs">{project.name}</span>
          </div>
        </div>

        {/* Header & Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="w-full space-y-4">
            
            {/* Project Header Component */}
            <ProjectHeader 
              project={project} 
              onCreateTask={() => setIsTaskModalOpen(true)} 
            />

            {/* Task Wizard Modal */}
            <TaskWizardModal
              isOpen={isTaskModalOpen}
              onClose={() => setIsTaskModalOpen(false)}
              initialProjectId={project.id}
            />

            {/* Overview Cards Component */}
            <OverviewCards project={project} tasks={safeTasks} />

            {/* Tabs */}
            <div className="flex space-x-6 border-b border-slate-200">
              {['overview', 'kanban', 'members', 'unassigned', 'backlog']
                .filter((tab) => isAdmin || tab !== 'unassigned')
                .map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-indigo-500 text-indigo-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="py-4 h-full">
              {activeTab === 'kanban' && (
                <div className="h-[700px]">
                  <KanbanBoard tasks={safeTasks} users={safeUsers as any} project={project} />
                </div>
              )}
              {activeTab === 'overview' && (
                <OverviewTab project={project} tasks={safeTasks} />
              )}
              {activeTab === 'members' && (
                <MembersTab 
                  users={(safeUsers as any).filter((u: any) => u.id === project.ownerId || project.members?.includes(u.id))} 
                  tasks={safeTasks} 
                />
              )}
              {activeTab === 'unassigned' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                  <div className="p-5 border-b border-slate-200 bg-white">
                    <h3 className="text-lg font-semibold text-slate-900">Unassigned Tasks</h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {safeTasks.filter((t: any) => !t.assigneeId).length === 0 ? (
                      <div className="flex-1 mt-12">
                        <EmptyState 
                          icon={Users}
                          title="Task Pool Empty"
                          description="All project tasks have been successfully allocated to your team members."
                        />
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                          <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Task</th>
                            <th className="px-6 py-4">Assign To</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Priority</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {safeTasks.filter((t: any) => !t.assigneeId).map((task: any) => (
                            <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{task.title}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <select 
                                  value={task.assigneeId || ""} 
                                  onChange={(e) => {
                                    const newAssigneeId = e.target.value;
                                    if (!newAssigneeId) return;
                                    const targetStatus = projectColumns.some((c: any) => c.id === "TODO")
                                      ? "TODO"
                                      : (projectColumns[0]?.id || "TODO");
                                    updateTask.mutate(
                                      {
                                        id: task.id,
                                        assigneeId: newAssigneeId,
                                        status: targetStatus,
                                        projectId: project?.id,
                                      },
                                      {
                                        onSuccess: () =>
                                          toast.success(
                                            `Task assigned and moved to ${
                                              targetStatus === "TODO" ? "To Do" : targetStatus
                                            }`
                                          ),
                                        onError: () => toast.error("Failed to assign task"),
                                      }
                                    );
                                  }}
                                  disabled={updateTask.isPending}
                                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer hover:border-slate-300"
                                >
                                  <option value="">Assign to member...</option>
                                  {projectMembers.map((member: any) => (
                                    <option key={member.id} value={member.id}>
                                      {member.name || member.email}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {task.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell text-sm text-slate-500">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'backlog' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                  <div className="p-5 border-b border-slate-200 bg-white">
                    <h3 className="text-lg font-semibold text-slate-900">Backlog (To Do)</h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {safeTasks.filter((t: any) => t.status === 'BACKLOG').length === 0 ? (
                      <div className="flex-1 mt-12">
                        <EmptyState 
                          icon={ListTodo}
                          title="Backlog is Clear"
                          description="You have no pending tasks in your backlog. Start planning and create new tasks to organize your project."
                        />
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                          <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Task</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Priority</th>
                            <th className="px-6 py-4 hidden md:table-cell">Assigned To</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {safeTasks.filter((t: any) => t.status === 'BACKLOG').map((task: any) => (
                            <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{task.title}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <select 
                                  value={task.status} 
                                  onChange={(e) => {
                                    fetch(`/api/tasks/${task.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: e.target.value })
                                    }).then(() => window.location.reload());
                                  }}
                                  className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="BACKLOG">BACKLOG</option>
                                  {projectColumns.map((col: any) => (
                                    <option key={col.id} value={col.id}>
                                      {col.title.toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {task.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell text-sm text-slate-600">
                                {task.assigneeId ? (safeUsers.find((u: any) => u.id === task.assigneeId)?.name || "Assigned") : "Unassigned"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell text-sm text-slate-500">
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
