"""Email Service for sending welcome invitations and notifications using Resend HTTPS API."""

import asyncio
import json
import logging
from pathlib import Path
from typing import Optional
import urllib.error
import urllib.request
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
    """Handles dispatching onboarding and notification emails asynchronously via Resend HTTPS REST API."""

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
            expire_minutes=60,
        )

    @classmethod
    def _send_resend_sync(cls, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email via Resend HTTPS REST API (Port 443 - works everywhere without firewall restrictions)."""
        current_settings = get_settings()
        api_key = current_settings.RESEND_API_KEY
        if not api_key:
            logger.info(
                "[DEV MODE] RESEND_API_KEY not configured. Simulated email to: %s | Subject: '%s'",
                to_email,
                subject,
            )
            return True

        from_header = current_settings.RESEND_FROM or "Taskboard Support <onboarding@resend.dev>"
        payload = {
            "from": from_header,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Taskboard-App/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15.0) as resp:
                status_code = resp.getcode()
                if 200 <= status_code < 300:
                    logger.info("Successfully delivered email to %s via Resend HTTPS API (From: %s)", to_email, from_header)
                    return True
                logger.error("Resend API returned non-2xx status code: %d", status_code)
                return False
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="ignore")
            logger.error("Failed to send email to %s via Resend API: HTTP %d - %s", to_email, err.code, err_body)
            return False
        except Exception as exc:
            logger.error("Unexpected error sending email to %s via Resend API: %s", to_email, exc)
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

        # Execute blocking I/O in worker thread pool
        return await asyncio.to_thread(
            cls._send_resend_sync,
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
            cls._send_resend_sync,
            email,
            subject,
            html_content,
            plain_text,
        )


