import React, { useState, useEffect } from 'react';
import { X, CheckSquare, MessageSquare, MoreVertical, Trash2 } from 'lucide-react';
import { TaskSummary } from './TaskSummary';
import { DetailsTab } from './tabs/DetailsTab';
import { CommentsTab } from './tabs/CommentsTab';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { useUpdateTask, useDeleteTask } from '../../../hooks/useTasks';
import { useSession } from 'next-auth/react';
import { useProjects } from '../../../hooks/useProjects';

import type { Task, User, TaskStatus, TaskPriority } from '../../../server/types';

// Mock data types - replace with actual types later
type TabType = 'details' | 'comments';

interface TaskDetailsPanelProps {
  task: Task | null;
  users?: User[];
  isOpen: boolean;
  onClose: () => void;
  project?: any;
}

export function TaskDetailsPanel({ task, users, isOpen, onClose, project: propProject }: TaskDetailsPanelProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const { data: projects } = useProjects();
  const project = propProject || projects?.find((p) => p.id === task?.projectId);

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isLoading, setIsLoading] = useState(false);
  
  const [editedStatus, setEditedStatus] = useState<TaskStatus | undefined>(task?.status);
  const [editedPriority, setEditedPriority] = useState<TaskPriority | undefined>(task?.priority);

  const availableColumns = React.useMemo(() => {
    const defaultCols = [
      { id: "TODO", title: "To Do" },
      { id: "IN_PROGRESS", title: "In Progress" },
      { id: "REVIEW", title: "Review" },
      { id: "DONE", title: "Done" },
    ];
    const cols = (
      project?.columns && project.columns.length > 0
        ? project.columns
        : defaultCols
    ).filter((c: any) => c.id !== "BACKLOG");

    return [{ id: "BACKLOG", title: "Backlog" }, ...cols];
  }, [project?.columns]);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  const { mutate: updateTask, isPending } = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mock fetching data
  useEffect(() => {
    if (isOpen && task) {
      const isValid = availableColumns.some((c) => c.id === task.status);
      const safeStatus = isValid ? task.status : "BACKLOG";
      setEditedStatus(safeStatus);
      setEditedPriority(task.priority);
      setIsLoading(true);
      // Simulate API call
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, task, availableColumns]);

  if (!isOpen || !task) return null;

  const handleStatusChange = (newStatus: TaskStatus) => {
    setEditedStatus(newStatus);
    updateTask(
      { id: task.id, status: newStatus },
      {
        onSuccess: () => toast.success('Status updated'),
        onError: () => toast.error('Failed to update status')
      }
    );
  };

  const handleAssigneeChange = (userId: string | null) => {
    if (userId && project) {
      const isMember =
        project.ownerId === userId ||
        (Array.isArray(project.members) && project.members.includes(userId));
      if (!isMember) {
        toast.error("Add the member to the project and then assign task");
        return;
      }
    }
    const updates: any = {
      id: task.id,
      assigneeId: userId || "",
      projectId: task.projectId,
    };
    if (!userId && task.status === "TODO") {
      updates.status = "BACKLOG";
    } else if (userId && (!task.status || task.status === "BACKLOG")) {
      updates.status = "TODO";
    }

    updateTask(
      updates,
      {
        onSuccess: () =>
          toast.success(
            userId
              ? "Task assigned and moved to To Do"
              : "Task moved to unassigned"
          ),
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Failed to update assignee';
          toast.error(msg);
        }
      }
    );
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    setEditedPriority(newPriority);
    updateTask(
      { id: task.id, priority: newPriority },
      {
        onSuccess: () => toast.success('Priority updated'),
        onError: () => toast.error('Failed to update priority')
      }
    );
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: CheckSquare },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-1/2 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1 truncate">
              <span>Projects</span>
              <span>/</span>
              <span>Task</span>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-xl font-semibold text-gray-900 break-all sm:break-words line-clamp-2" title={task.title}>{task.title}</h2>
              <select
                value={editedStatus || ""}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={isPending}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border-none cursor-pointer focus:ring-2 focus:ring-blue-500 hover:bg-blue-200 transition-colors disabled:opacity-50 shrink-0"
              >
                {availableColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
              <select
                value={editedPriority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                disabled={isPending || !isAdmin}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border-none cursor-pointer focus:ring-2 focus:ring-red-500 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(isAdmin || task.assigneeId === (session?.user as any)?.id) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5"
                title="Delete Task"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-gray-500" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="h-24 bg-gray-200 rounded-lg"></div>
              <div className="h-8 bg-gray-200 w-1/2 rounded"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          ) : (
            <div className="p-6 space-y-6 break-words">
              {/* Task Summary Cards */}
              <TaskSummary task={task} />

              {/* Tabs Navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                          ${isActive 
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <Icon className={`
                          -ml-0.5 mr-2 h-4 w-4
                          ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                        `} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-6 h-full">
                {activeTab === 'details' && <DetailsTab task={task} users={users} project={project} onAssign={handleAssigneeChange} />}
                {activeTab === 'comments' && <CommentsTab comments={comments} setComments={setComments} newComment={newComment} setNewComment={setNewComment} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Delete Task</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{task.title}"</span>? This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteTask.isPending}
                onClick={() => {
                  deleteTask.mutate(task.id, {
                    onSuccess: () => {
                      toast.success("Task deleted successfully");
                      setShowDeleteConfirm(false);
                      onClose();
                    },
                    onError: (err: any) => {
                      toast.error(err?.response?.data?.message || "Failed to delete task");
                    }
                  });
                }}
              >
                Delete Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
