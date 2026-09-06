import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { userRepository } from "../repositories/user.repository";
import { Task, Project, User, UserRole } from "../types";

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
  async getDashboardData(
    userId: string,
    role: UserRole,
    clientData?: { tasks?: Task[]; projects?: Project[]; users?: User[] }
  ): Promise<AnalyticsData> {
    const isMember = role === "MEMBER";

    const dbProjects = await projectRepository.findAll();
    const dbTasks = await taskRepository.findAll();
    const dbUsers = await userRepository.findAll();

    // Merge database and clientData so analytics reflects all updated projects and tasks
    const projectsMap = new Map<string, Project>();
    for (const p of dbProjects) {
      if (p && p.id) projectsMap.set(p.id, p);
    }
    for (const p of (clientData?.projects || [])) {
      if (p && p.id) projectsMap.set(p.id, { ...(projectsMap.get(p.id) || {}), ...p });
    }
    let projects = Array.from(projectsMap.values());

    const tasksMap = new Map<string, Task>();
    for (const t of dbTasks) {
      if (t && t.id) tasksMap.set(t.id, t);
    }
    for (const t of (clientData?.tasks || [])) {
      if (t && t.id) tasksMap.set(t.id, { ...(tasksMap.get(t.id) || {}), ...t });
    }
    let tasks = Array.from(tasksMap.values());

    const usersMap = new Map<string, User>();
    const seenEmails = new Set<string>();
    for (const u of dbUsers) {
      if (u && u.id) {
        usersMap.set(u.id, u);
        if (u.email) seenEmails.add(u.email.trim().toLowerCase());
      }
    }
    for (const u of (clientData?.users || [])) {
      if (u && u.id) {
        const cleanEmail = u.email ? u.email.trim().toLowerCase() : "";
        if (!usersMap.has(u.id) && (!cleanEmail || !seenEmails.has(cleanEmail))) {
          usersMap.set(u.id, u);
          if (cleanEmail) seenEmails.add(cleanEmail);
        }
      }
    }
    const allUsers = Array.from(usersMap.values());

    const cleanUserId = (userId || "").trim().toLowerCase();
    const currentUser = allUsers.find(
      (u) => u.id === userId || (u.email && u.email.trim().toLowerCase() === cleanUserId)
    );
    const userIdentifier = currentUser?.id || userId;
    const userEmail = currentUser?.email?.trim().toLowerCase() || cleanUserId;

    if (isMember) {
      projects = projects.filter(
        (p) =>
          (p.members && (p.members.includes(userIdentifier) || p.members.includes(userEmail))) ||
          p.ownerId === userIdentifier ||
          p.ownerId === userEmail
      );
      tasks = tasks.filter((t) => {
        const aId = (t.assigneeId || "").trim().toLowerCase();
        const aList = (t.assignees || []).map((a) => (a || "").trim().toLowerCase());
        return (
          t.assigneeId === userIdentifier ||
          aId === userEmail ||
          t.assignees?.includes(userIdentifier) ||
          aList.includes(userEmail)
        );
      });
    }

    const now = new Date();

    const isTaskDone = (status?: string): boolean => {
      const s = (status || "").toUpperCase();
      return s === "DONE" || s === "COMPLETED";
    };

    // Calculate basic metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => isTaskDone(t.status)).length;

    const overdueTasksList = tasks.filter(
      (t) => !isTaskDone(t.status) && t.dueDate && new Date(t.dueDate) < now
    );
    const overdueTasks = overdueTasksList.length;
    const activeMembers = allUsers.filter((u) => u.status === "ACTIVE").length || allUsers.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Task Status Distribution
    const statuses = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    tasks.forEach((t) => {
      const s = (t.status || "").toUpperCase();
      if (s === "DONE" || s === "COMPLETED") {
        statuses.DONE++;
      } else if (s === "IN_PROGRESS") {
        statuses.IN_PROGRESS++;
      } else if (s === "REVIEW") {
        statuses.REVIEW++;
      } else {
        statuses.TODO++;
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
    tasks.forEach((t) => {
      const p = (t.priority || "").toUpperCase();
      if (p === "HIGH" || p === "CRITICAL") {
        priorities.HIGH++;
      } else if (p === "LOW") {
        priorities.LOW++;
      } else {
        priorities.MEDIUM++;
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
      const pTasks = tasks.filter((t) => t.projectId === project.id);
      const pTotal = pTasks.length;
      const pCompleted = pTasks.filter((t) => isTaskDone(t.status)).length;
      const progress = pTotal > 0 ? Math.round((pCompleted / pTotal) * 100) : (project.progress || 0);

      projectProgress.push({
        id: project.id,
        name: project.name,
        progress: progress,
        status: project.status,
      });

      const pOverdue = pTasks.filter((t) => !isTaskDone(t.status) && t.dueDate && new Date(t.dueDate) < now).length;

      let healthScore = progress;
      if (pOverdue > 0) healthScore -= pOverdue * 5;
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
        dueDate: project.dueDate || null,
      });
    }

    // Workload Distribution & Member Performance
    const workloadDistribution = [];
    const usersToCalculate = isMember
      ? allUsers.filter(
          (u) => u.id === userIdentifier || (u.email && u.email.trim().toLowerCase() === userEmail)
        )
      : allUsers;

    for (const user of usersToCalculate) {
      const uEmail = user.email ? user.email.trim().toLowerCase() : "";
      const uTasks = tasks.filter((t) => {
        const aId = (t.assigneeId || "").trim().toLowerCase();
        const aList = (t.assignees || []).map((a) => (a || "").trim().toLowerCase());
        return (
          t.assigneeId === user.id ||
          t.assignees?.includes(user.id) ||
          (uEmail && (aId === uEmail || aList.includes(uEmail)))
        );
      });

      const assigned = uTasks.length;
      const completed = uTasks.filter((t) => isTaskDone(t.status)).length;
      const overdue = uTasks.filter((t) => !isTaskDone(t.status) && t.dueDate && new Date(t.dueDate) < now).length;

      workloadDistribution.push({
        memberId: user.id,
        memberName: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        assigned,
        completed,
        overdue,
      });
    }

    // Task Completion Trend (Last 7 Days)
    const taskCompletionTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const completedOnDate = tasks.filter((t) => {
        if (!isTaskDone(t.status)) return false;
        const taskDate = (t as any).completedAt || t.updatedAt || t.createdAt;
        if (!taskDate) return false;

        const td = new Date(taskDate);
        return (
          td.getFullYear() === d.getFullYear() &&
          td.getMonth() === d.getMonth() &&
          td.getDate() === d.getDate()
        );
      }).length;

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
        completionRate,
      },
      taskStatusDistribution,
      projectProgress,
      workloadDistribution,
      priorityDistribution,
      projectHealth,
      taskCompletionTrend,
    };
  }
}

export const analyticsService = new AnalyticsService();
