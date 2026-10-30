"""Analytics Service aggregating task metrics, assignee workload, and completion trends with Redis caching."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.project_repository import ProjectRepository
from app.dao.task_repository import TaskRepository
from app.dao.user_repository import UserRepository
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsData,
    CompletionTrendItem,
    KpiMetrics,
    MemberWorkloadItem,
    PriorityDistributionItem,
    ProjectProgressItem,
    ProjectSummaryItem,
    StatusDistributionItem,
    TaskStatusDistribution,
    WorkloadItem,
)
from app.utils.redis import get_redis_client

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service handling analytics aggregation and Redis caching."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)

    async def get_analytics(
        self,
        current_user: User,
        project_id: Optional[uuid.UUID] = None,
        filter_mode: Optional[str] = "all",
    ) -> AnalyticsData:
        """Retrieve analytics data, checking Redis cache first and writing cache on miss."""
        is_admin = (current_user.role or "").lower() == "admin"

        # Validate project existence and access permissions if project_id is provided
        project = None
        if project_id is not None:
            project = await self.project_repo.get_by_id(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "message": "The specified project could not be found.",
                        "error": {"code": "PROJECT_NOT_FOUND"},
                        "code": "PROJECT_NOT_FOUND",
                    },
                )

            if not is_admin:
                is_owner = str(project.created_by) == str(current_user.id)
                is_member = any(str(m.id) == str(current_user.id) for m in (project.members or []))
                if not is_owner and not is_member:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={
                            "message": "You do not have access to analytics for this project.",
                            "error": {"code": "INSUFFICIENT_PERMISSIONS"},
                            "code": "INSUFFICIENT_PERMISSIONS",
                        },
                    )

        cache_key = f"analytics:overview:{project_id or 'all'}:{current_user.id if not is_admin else 'admin'}:{filter_mode}"

        # 1. Check Redis Cache
        try:
            redis = get_redis_client()
            cached_val = await redis.get(cache_key)
            if cached_val:
                logger.info("Serving analytics from Redis cache (%s)", cache_key)
                return AnalyticsData.model_validate_json(cached_val)
        except Exception as exc:
            logger.warning("Redis cache lookup failed, querying database: %s", exc)

        # 2. Fetch Projects accessible to user
        all_projects = await self.project_repo.get_all(
            user_id=current_user.id if not is_admin else None,
            is_admin=is_admin,
        )

        projects_list = [
            ProjectSummaryItem(id=str(p.id), name=p.name, key=p.key)
            for p in all_projects
        ]
        if project and not any(str(p.id) == str(project.id) for p in all_projects):
            projects_list.append(ProjectSummaryItem(id=str(project.id), name=project.name, key=project.key))

        # 3. Fetch Tasks
        if project_id:
            tasks = await self.task_repo.get_by_project(project_id)
        else:
            tasks = await self.task_repo.get_all(
                user_id=current_user.id if not is_admin else None,
                is_admin=is_admin,
            )

        # Non-admin or filter_mode == 'my' scoping
        if not is_admin or filter_mode == "my":
            tasks = [
                t for t in tasks
                if t.assignee_id == current_user.id
            ]

        # 4. Status Counts & Distribution
        todo = 0
        in_progress = 0
        in_review = 0
        done = 0
        now = datetime.now(timezone.utc)
        overdue_tasks = 0

        for task in tasks:
            st = (task.status or "").strip().upper()
            is_done = st in ("DONE", "COMPLETED", "RESOLVED")

            if is_done:
                done += 1
            elif st in ("REVIEW", "IN_REVIEW", "IN REVIEW"):
                in_review += 1
            elif st in ("IN_PROGRESS", "IN PROGRESS", "PROGRESS"):
                in_progress += 1
            else:
                todo += 1

            if not is_done and task.due_date:
                try:
                    due_d = datetime.fromisoformat(task.due_date.replace("Z", "+00:00"))
                    if due_d.tzinfo is None:
                        due_d = due_d.replace(tzinfo=timezone.utc)
                    if due_d < now:
                        overdue_tasks += 1
                except Exception:
                    pass

        task_status = TaskStatusDistribution(
            todo=todo,
            in_progress=in_progress,
            in_review=in_review,
            done=done,
        )

        task_status_distribution = [
            StatusDistributionItem(name="Todo", value=todo),
            StatusDistributionItem(name="In Progress", value=in_progress),
            StatusDistributionItem(name="Review", value=in_review),
            StatusDistributionItem(name="Done", value=done),
        ]

        # 5. Priorities
        priority_counts: Dict[str, int] = defaultdict(int)
        for task in tasks:
            p = (task.priority or "MEDIUM").strip().upper()
            if p in ("HIGH", "CRITICAL"):
                priority_counts["High"] += 1
            elif p == "LOW":
                priority_counts["Low"] += 1
            else:
                priority_counts["Medium"] += 1

        priority_distribution = [
            PriorityDistributionItem(name="High", value=priority_counts["High"]),
            PriorityDistributionItem(name="Medium", value=priority_counts["Medium"]),
            PriorityDistributionItem(name="Low", value=priority_counts["Low"]),
        ]

        # 6. Workload & Member Performance
        all_users = await self.user_repo.get_all()
        users_by_id = {u.id: u for u in all_users}

        workload_map: Dict[uuid.UUID, Dict[str, int]] = defaultdict(lambda: {"assigned": 0, "completed": 0, "overdue": 0})
        for task in tasks:
            if task.assignee_id:
                st = (task.status or "").strip().upper()
                is_done = st in ("DONE", "COMPLETED", "RESOLVED")
                workload_map[task.assignee_id]["assigned"] += 1
                if is_done:
                    workload_map[task.assignee_id]["completed"] += 1
                elif task.due_date:
                    try:
                        due_d = datetime.fromisoformat(task.due_date.replace("Z", "+00:00"))
                        if due_d.tzinfo is None:
                            due_d = due_d.replace(tzinfo=timezone.utc)
                        if due_d < now:
                            workload_map[task.assignee_id]["overdue"] += 1
                    except Exception:
                        pass

        workload: List[WorkloadItem] = []
        workload_distribution: List[MemberWorkloadItem] = []

        for uid, counts in workload_map.items():
            u = users_by_id.get(uid)
            display_name = (
                getattr(u, "full_name", None)
                or getattr(u, "name", None)
                or (u.email if u else "Unknown")
            )
            workload.append(
                WorkloadItem(
                    user_id=uid,
                    user_name=display_name,
                    assigned_tasks=counts["assigned"],
                )
            )
            workload_distribution.append(
                MemberWorkloadItem(
                    member_id=str(uid),
                    member_name=display_name,
                    assigned=counts["assigned"],
                    completed=counts["completed"],
                    overdue=counts["overdue"],
                )
            )

        workload.sort(key=lambda w: (-w.assigned_tasks, w.user_name))
        workload_distribution.sort(key=lambda w: (-w.assigned, w.member_name))

        # 7. Completion Trend
        completion_by_date: Dict[str, int] = defaultdict(int)
        for task in tasks:
            st = (task.status or "").strip().upper()
            if st in ("DONE", "COMPLETED", "RESOLVED"):
                ts = task.updated_at or task.created_at
                if ts:
                    d_str = ts.strftime("%Y-%m-%d")
                    completion_by_date[d_str] += 1

        completion_trend: List[CompletionTrendItem] = []
        if completion_by_date:
            for d_str in sorted(completion_by_date.keys()):
                completion_trend.append(
                    CompletionTrendItem(
                        date=d_str,
                        completed_tasks=completion_by_date[d_str],
                    )
                )
        else:
            today = datetime.now(timezone.utc).date()
            for i in range(6, -1, -1):
                day_str = (today - timedelta(days=i)).isoformat()
                completion_trend.append(CompletionTrendItem(date=day_str, completed=0))

        # 8. Project Progress
        scoped_projects = (
            [p for p in all_projects if str(p.id) == str(project_id)] or ([project] if project else [])
            if project_id
            else all_projects
        )

        project_progress: List[ProjectProgressItem] = [
            ProjectProgressItem(
                id=str(p.id),
                name=p.name,
                progress=p.progress or 0,
                status=p.status or "ACTIVE",
            )
            for p in scoped_projects
        ]

        # 9. KPIs
        total_projects = len(scoped_projects) if project_id else len(all_projects)
        active_projects = sum(1 for p in (scoped_projects if project_id else all_projects) if (p.status or "").upper() == "ACTIVE")
        completed_projects = sum(1 for p in (scoped_projects if project_id else all_projects) if (p.status or "").upper() == "COMPLETED")
        total_tasks = len(tasks)
        completion_rate = round((done / total_tasks * 100)) if total_tasks > 0 else 0
        active_members = len(workload_distribution) or len(all_users)

        kpi = KpiMetrics(
            total_projects=total_projects,
            active_projects=active_projects,
            completed_projects=completed_projects,
            total_tasks=total_tasks,
            completed_tasks=done,
            overdue_tasks=overdue_tasks,
            active_members=active_members,
            completion_rate=completion_rate,
        )

        analytics_data = AnalyticsData(
            task_status=task_status,
            workload=workload,
            completion_trend=completion_trend,
            kpi=kpi,
            task_status_distribution=task_status_distribution,
            priority_distribution=priority_distribution,
            workload_distribution=workload_distribution,
            task_completion_trend=completion_trend,
            project_progress=project_progress,
            projects_list=projects_list,
            selected_project_id=str(project_id) if project_id else "all",
        )

        # 10. Cache Result in Redis (TTL = 300 seconds)
        try:
            redis = get_redis_client()
            await redis.set(cache_key, analytics_data.model_dump_json(), ex=300)
            logger.info("Stored analytics in Redis cache (%s, TTL=300s)", cache_key)
        except Exception as exc:
            logger.warning("Redis cache write failed: %s", exc)

        return analytics_data
