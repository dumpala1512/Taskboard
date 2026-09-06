import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import { Task, Project, UserRole } from "../types";

export interface AnalyticsData {
  kpi: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    activeMembers: number;
    completionRate: number;
  };
  taskStatusDistribution: { name: string; value: number }[];
  projectProgress: { id: string; name: string; progress: number; status: string }[];
  workloadDistribution: { memberId: string; memberName: string; assigned: number; completed: number; overdue: number }[];
  priorityDistribution: { name: string; value: number }[];
  projectHealth: { id: string; name: string; progress: number; healthScore: number; status: string; overdueTasks: number; activeMembers: number; dueDate: string | null }[];
  taskCompletionTrend: { date: string; completed: number }[];
}

export class AnalyticsService {
  async getDashboardData(userId: string, role: UserRole): Promise<AnalyticsData> {
    const isMember = role === "MEMBER";

    let projects = await projectRepository.findAll();
    let tasks = await taskRepository.findAll();
    const allUsers = await userRepository.findAll();

    if (isMember) {
      projects = projects.filter(p => p.members.includes(userId) || p.ownerId === userId);
      tasks = tasks.filter(t => t.assignees?.includes(userId) || t.assigneeId === userId);
    }

    const now = new Date();

    // Calculate basic metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === "ACTIVE").length;
    const completedProjects = projects.filter(p => p.status === "COMPLETED").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "DONE").length;
    
    const overdueTasksList = tasks.filter(t => 
      t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now
    );
    const overdueTasks = overdueTasksList.length;
    const activeMembers = allUsers.filter(u => u.status === "ACTIVE").length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Task Status Distribution
    const statuses = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    tasks.forEach(t => {
      if (statuses[t.status as keyof typeof statuses] !== undefined) {
        statuses[t.status as keyof typeof statuses]++;
      }
    });
    const taskStatusDistribution = [
      { name: "Todo", value: statuses.TODO },
      { name: "In Progress", value: statuses.IN_PROGRESS },
      { name: "Review", value: statuses.REVIEW },
      { name: "Done", value: statuses.DONE },
    ];

    // Priority Distribution
    const priorities = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    tasks.forEach(t => {
      if (priorities[t.priority as keyof typeof priorities] !== undefined) {
        priorities[t.priority as keyof typeof priorities]++;
      }
    });
    const priorityDistribution = [
      { name: "High", value: priorities.HIGH },
      { name: "Medium", value: priorities.MEDIUM },
      { name: "Low", value: priorities.LOW },
    ];

    // Project Progress & Health
    const projectProgress = [];
    const projectHealth = [];

    for (const project of projects) {
      const pTasks = tasks.filter(t => t.projectId === project.id);
      const pTotal = pTasks.length;
      const pCompleted = pTasks.filter(t => t.status === "DONE").length;
      const progress = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : 0;
      
      projectProgress.push({
        id: project.id,
        name: project.name,
        progress: progress,
        status: project.status
      });

      const pOverdue = pTasks.filter(t => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now).length;
      
      let healthScore = progress;
      if (pOverdue > 0) healthScore -= (pOverdue * 5); // penalty
      if (healthScore < 0) healthScore = 0;
      if (healthScore > 100) healthScore = 100;

      projectHealth.push({
        id: project.id,
        name: project.name,
        progress: progress,
        healthScore: healthScore,
        status: project.status,
        overdueTasks: pOverdue,
        activeMembers: project.members?.length || 0,
        dueDate: project.dueDate || null
      });
    }

    // Workload Distribution
    const workloadDistribution = [];
    const usersToCalculate = isMember ? allUsers.filter(u => u.id === userId) : allUsers;
    
    for (const user of usersToCalculate) {
      const uTasks = tasks.filter(t => t.assignees?.includes(user.id) || t.assigneeId === user.id);
      if (uTasks.length > 0 || !isMember) {
        workloadDistribution.push({
          memberId: user.id,
          memberName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          assigned: uTasks.length,
          completed: uTasks.filter(t => t.status === "DONE").length,
          overdue: uTasks.filter(t => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now).length
        });
      }
    }

    // Task Completion Trend
    const taskCompletionTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const completedOnDate = tasks.filter(t => 
        t.status === "DONE" && t.updatedAt?.startsWith(dateStr)
      ).length;
      taskCompletionTrend.push({ date: dateStr, completed: completedOnDate });
    }

    return {
      kpi: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        overdueTasks,
        activeMembers,
        completionRate
      },
      taskStatusDistribution,
      projectProgress,
      workloadDistribution,
      priorityDistribution,
      projectHealth,
      taskCompletionTrend
    };
  }
}

export const analyticsService = new AnalyticsService();
