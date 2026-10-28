"""Admin User Database Seeding Script.

Creates an initial administrator account if it does not already exist,
or safely updates the admin role and password if requested.

Can be run directly via:
    uv run python scripts/seed_admin.py
or inside Docker:
    python scripts/seed_admin.py
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
import uuid

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select
from app.core.config import get_settings
from app.db.session import async_session_factory
from app.models.user import User
from app.services.auth_service import PasswordService


async def seed_admin(
    email: str,
    password: str,
    full_name: str,
    role: str = "admin",
    force_update: bool = False,
) -> None:
    """Create or update the administrator user."""
    clean_email = email.strip().lower()
    settings = get_settings()

    print(f"Connecting to database: {settings.DATABASE_URL.split('@')[-1]}...")

    async with async_session_factory() as session:
        # Check if user with this email already exists
        query = select(User).where(func.lower(User.email) == clean_email)
        result = await session.execute(query)
        user = result.scalars().first()

        password_hash = PasswordService.hash_password(password)

        if user:
            print(f"User with email '{clean_email}' already exists (ID: {user.id}, Role: {user.role}).")
            if force_update or user.role != role:
                user.role = role
                user.full_name = full_name
                user.password_hash = password_hash
                await session.commit()
                await session.refresh(user)
                print(f"Successfully updated user '{clean_email}' to role '{role}' and updated credentials.")
            else:
                print(f"Admin user '{clean_email}' is already configured. (Use --force to reset password)")
        else:
            new_admin = User(
                id=uuid.uuid4(),
                full_name=full_name,
                email=clean_email,
                password_hash=password_hash,
                role=role,
            )
            session.add(new_admin)
            await session.commit()
            await session.refresh(new_admin)
            print("=" * 60)
            print("ADMIN USER SEEDED SUCCESSFULLY")
            print("=" * 60)
            print(f"  ID:       {new_admin.id}")
            print(f"  Name:     {new_admin.full_name}")
            print(f"  Email:    {new_admin.email}")
            print(f"  Role:     {new_admin.role}")
            print(f"  Password: {password}")
            print("=" * 60)


def parse_arguments() -> argparse.Namespace:
    """Parse CLI options for admin seeding."""
    parser = argparse.ArgumentParser(description="Seed initial admin user into the database.")
    parser.add_argument(
        "--email",
        type=str,
        default=os.getenv("ADMIN_EMAIL", "admin@taskboard.com"),
        help="Admin user email address (default: admin@taskboard.com or ADMIN_EMAIL env)",
    )
    parser.add_argument(
        "--password",
        type=str,
        default=os.getenv("ADMIN_PASSWORD", "Admin123!"),
        help="Admin user password (default: Admin123! or ADMIN_PASSWORD env)",
    )
    parser.add_argument(
        "--name",
        type=str,
        default=os.getenv("ADMIN_NAME", "System Administrator"),
        help="Admin user display name (default: System Administrator or ADMIN_NAME env)",
    )
    parser.add_argument(
        "--role",
        type=str,
        default=os.getenv("ADMIN_ROLE", "admin"),
        help="Admin role (default: admin)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force update credentials if admin user already exists",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    try:
        asyncio.run(
            seed_admin(
                email=args.email,
                password=args.password,
                full_name=args.name,
                role=args.role,
                force_update=args.force,
            )
        )
    except Exception as exc:
        print(f"Error seeding admin user: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
