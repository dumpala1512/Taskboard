export type UserRole = "ADMIN" | "MEMBER";

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: string;
  name: string; // Keep for backward compatibility or as full name
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  lastLogin?: string;
  isFirstLogin?: boolean;
  passwordChangedAt?: string;
  createdBy?: string;
  passwordHash: string;
  tempPassword?: string;
  resetToken?: string;
  resetTokenExpiry?: number;
  createdAt: string;
  joiningDate?: string;
  assignedProjectIds?: string[];
}

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";

export interface Project {
  id: string;
  key?: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  ownerId?: string; // User ID of the owner
  members: string[]; // User IDs
  columns?: { id: string; title: string }[];
  tags?: string[];
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | string;
export type TaskTag = "UI" | "BACKEND" | "API" | "BUG" | "FEATURE" | "DOCUMENTATION";

export type TaskType = "Feature" | "Bug" | "Improvement" | "Research" | "Documentation";

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string; // Single assignee for Phase 6
  assignees: string[]; // User IDs (kept for backward compatibility)
  tags: TaskTag[];
  dueDate: string | null;
  taskType?: TaskType;
  startDate?: string | null;
  estimatedTime?: number | null; // in hours
  points?: number; // Estimated story points
  attachments?: TaskAttachment[];
  notes?: string;
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_COMPLETED"
  | "TASK_DELETED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "MEMBER_ASSIGNED";

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string; // User who performed the action
  projectId?: string;
  taskId?: string;
  details: string;
  fromStatus?: string;
  toStatus?: string;
  taskTitle?: string;
  createdAt: string;
}

// Database schema
export interface Database {
  users: User[];
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
  deletedUserIds?: string[];
  deletedProjectIds?: string[];
  deletedTaskIds?: string[];
}
