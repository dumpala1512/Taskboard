"""Email Service for sending welcome invitations and notifications using Jinja templates."""

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from pathlib import Path
import smtplib
from typing import Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Jinja2 environment pointing to template directory
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


class EmailService:
    """Handles dispatching onboarding and notification emails asynchronously."""

    @staticmethod
    def _render_invitation_html(name: str, activation_url: str, role: str) -> str:
        """Render responsive, styled HTML invitation email using Jinja template."""
        template = jinja_env.get_template("invitation.html")
        return template.render(
            name=name or "there",
            activation_url=activation_url,
            role=role.capitalize() if role else "Member",
            expire_hours=get_settings().INVITATION_TOKEN_EXPIRE_HOURS,
        )

    @staticmethod
    def _render_password_reset_html(name: str, reset_url: str) -> str:
        """Render responsive, styled HTML password reset email using Jinja template."""
        template = jinja_env.get_template("reset_password.html")
        return template.render(
            name=name or "there",
            reset_url=reset_url,
            expire_hours=1,
        )

    @classmethod
    def _send_smtp_sync(cls, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Internal synchronous helper for sending email via SMTP."""
        current_settings = get_settings()
        if not current_settings.SMTP_USER or not current_settings.SMTP_PASSWORD:
            logger.info(
                "[DEV MODE] SMTP credentials not set. Simulated email to: %s | Subject: '%s'",
                to_email,
                subject,
            )
            return True

        from_header = current_settings.SMTP_FROM
        # If SMTP_FROM still uses default placeholder with no-reply domain, align with authenticated user for Gmail deliverability
        if "no-reply@taskboard.com" in from_header and current_settings.SMTP_USER:
            from_header = f"Taskboard Support <{current_settings.SMTP_USER}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        try:
            with smtplib.SMTP(current_settings.SMTP_HOST, current_settings.SMTP_PORT, timeout=15.0) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(current_settings.SMTP_USER, current_settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Successfully delivered email to %s via SMTP (From: %s)", to_email, from_header)
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to_email, exc)
            return False

    @classmethod
    async def send_invitation_email(
        cls,
        email: str,
        name: str,
        token: str,
        role: str = "member",
    ) -> bool:
        """Send account activation invitation email asynchronously."""
        current_settings = get_settings()
        activation_url = f"{current_settings.FRONTEND_URL}/auth/account-setup?token={token}&email={email}"
        subject = "Welcome to Taskboard — Complete your account setup"

        plain_text = (
            f"Hello {name},\n\n"
            f"You have been invited to join Taskboard as a {role}.\n"
            f"Please visit the following URL to activate your account and choose your password:\n\n"
            f"{activation_url}\n\n"
            f"This link expires in {current_settings.INVITATION_TOKEN_EXPIRE_HOURS} hours.\n"
        )
        html_content = cls._render_invitation_html(name, activation_url, role)

        logger.info(
            "Dispatching invitation email for %s (URL: %s)",
            email,
            activation_url,
        )

        # Execute blocking SMTP I/O in a separate thread pool
        return await asyncio.to_thread(
            cls._send_smtp_sync,
            email,
            subject,
            html_content,
            plain_text,
        )

    @classmethod
    async def send_password_reset_email(
        cls,
        email: str,
        name: str,
        token: str,
    ) -> bool:
        """Send password reset email asynchronously."""
        current_settings = get_settings()
        reset_url = f"{current_settings.FRONTEND_URL}/auth/reset-password?token={token}"
        subject = "Reset your Taskboard password"

        plain_text = (
            f"Hello {name},\n\n"
            f"We received a request to reset the password for your Taskboard account.\n"
            f"Please visit the following URL to set your new password:\n\n"
            f"{reset_url}\n\n"
            f"This link expires in 1 hour. If you did not request this, you can safely ignore this email.\n"
        )
        html_content = cls._render_password_reset_html(name, reset_url)

        logger.info(
            "Dispatching password reset email for %s (URL: %s)",
            email,
            reset_url,
        )

        return await asyncio.to_thread(
            cls._send_smtp_sync,
            email,
            subject,
            html_content,
            plain_text,
        )
