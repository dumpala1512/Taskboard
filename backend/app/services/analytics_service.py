"""Analytics Service aggregating task metrics, assignee workload, and completion trends with Redis caching."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.dao.task_repository import TaskRepository
from app.dao.user_repository import UserRepository
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsData,
    CompletionTrendItem,
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
        self.user_repo = UserRepository(db)

    async def get_analytics(
        self,
        current_user: User,
        project_id: Optional[uuid.UUID] = None,
    ) -> AnalyticsData:
        """Retrieve analytics data, checking Redis cache first and writing cache on miss."""
        cache_key = f"analytics:overview:{project_id or 'all'}"

        # 1. Check Redis Cache
        try:
            redis = get_redis_client()
            cached_val = await redis.get(cache_key)
            if cached_val:
                logger.info("Serving analytics from Redis cache (%s)", cache_key)
                return AnalyticsData.model_validate_json(cached_val)
        except Exception as exc:
            logger.warning("Redis cache lookup failed, querying database: %s", exc)

        # 2. Fetch Data from Database
        if project_id:
            tasks = await self.task_repo.get_by_project(project_id)
        else:
            tasks = await self.task_repo.get_all(user_id=None, is_admin=True)

        # 3. Calculate Task Status Distribution
        todo = 0
        in_progress = 0
        in_review = 0
        done = 0
        for task in tasks:
            st = (task.status or "").strip().upper()
            if st in ("DONE", "COMPLETED", "RESOLVED"):
                done += 1
            elif st in ("REVIEW", "IN_REVIEW", "IN REVIEW"):
                in_review += 1
            elif st in ("IN_PROGRESS", "IN PROGRESS", "PROGRESS"):
                in_progress += 1
            else:
                todo += 1

        task_status = TaskStatusDistribution(
            todo=todo,
            in_progress=in_progress,
            in_review=in_review,
            done=done,
        )

        # 4. Calculate Workload per Assignee
        user_counts: Dict[uuid.UUID, int] = defaultdict(int)
        for task in tasks:
            if task.assignee_id:
                user_counts[task.assignee_id] += 1

        all_users = await self.user_repo.get_all()
        users_by_id = {u.id: u for u in all_users}

        workload: List[WorkloadItem] = []
        for uid, count in user_counts.items():
            u = users_by_id.get(uid)
            display_name = u.full_name if (u and u.full_name) else (u.email if u else "Unknown")
            workload.append(
                WorkloadItem(
                    user_id=uid,
                    user_name=display_name,
                    assigned_tasks=count,
                )
            )
        workload.sort(key=lambda w: (-w.assigned_tasks, w.user_name))

        # 5. Calculate Completion Trend
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
                completion_trend.append(CompletionTrendItem(date=day_str, completed_tasks=0))

        analytics_data = AnalyticsData(
            task_status=task_status,
            workload=workload,
            completion_trend=completion_trend,
        )

        # 6. Cache Result in Redis (TTL = 300 seconds)
        try:
            redis = get_redis_client()
            await redis.set(cache_key, analytics_data.model_dump_json(), ex=300)
            logger.info("Stored analytics in Redis cache (%s, TTL=300s)", cache_key)
        except Exception as exc:
            logger.warning("Redis cache write failed: %s", exc)

        return analytics_data

