import db, { loadDb, saveDb } from "../data";
import { Project } from "../types";
import { v4 as uuidv4 } from "uuid";

export class ProjectRepository {
  async findAll(): Promise<Project[]> {
    const freshDb = loadDb();
    db.projects = freshDb.projects;
    return [...db.projects];
  }

  async findById(id: string): Promise<Project | undefined> {
    let project = db.projects.find(
      (p: Project) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase())
    );
    if (!project) {
      const freshDb = loadDb();
      project = freshDb.projects.find(
        (p: Project) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase())
      );
      if (project) {
        db.projects = freshDb.projects;
      }
    }
    return project;
  }

  async create(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<Project> {
    const newProject: Project = {
      columns: [
        { id: "TODO", title: "To Do" },
        { id: "IN_PROGRESS", title: "In Progress" },
        { id: "REVIEW", title: "Review" },
        { id: "DONE", title: "Done" },
      ],
      ...project,
      id: uuidv4(),
      key: project.key || `PRJ-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    loadDb();
    db.projects.push(newProject);
    saveDb();
    return newProject;
  }

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    loadDb();
    const index = db.projects.findIndex(
      (p: any) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase())
    );
    if (index === -1) {
      throw new Error("Project not found");
    }
    db.projects[index] = { 
      ...db.projects[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb();
    return db.projects[index];
  }

  async delete(id: string): Promise<boolean> {
    loadDb();
    const index = db.projects.findIndex(
      (p: any) => p.id === id || (p.key && p.key.toLowerCase() === id.toLowerCase())
    );
    if (index === -1) {
      return false;
    }
    db.projects.splice(index, 1);
    
    // Also cleanup tasks and activities related to this project
    db.tasks = db.tasks.filter((t: any) => t.projectId !== id);
    db.activities = db.activities.filter((a: any) => a.projectId !== id);
    
    saveDb();
    return true;
  }
}

export const projectRepository = new ProjectRepository();
