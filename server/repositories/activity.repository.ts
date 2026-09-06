import db, { saveDb } from "../data";
import { Activity } from "../types";
import { v4 as uuidv4 } from "uuid";

export class ActivityRepository {
	async findAll(): Promise<Activity[]> {
		// Return sorted by newest first
		return [...db.activities].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}

	async create(
		activity: Omit<Activity, "id" | "createdAt">,
	): Promise<Activity> {
		const newActivity: Activity = {
			...activity,
			id: uuidv4(),
			createdAt: new Date().toISOString(),
		};
		db.activities.push(newActivity);
		saveDb();
		return newActivity;
	}
}

export const activityRepository = new ActivityRepository();
