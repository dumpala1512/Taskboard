import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

export interface SendPasswordResetOptions {
	to: string;
	name?: string;
	resetUrl: string;
}

export interface SendMemberWelcomeOptions {
	to: string;
	name?: string;
	temporaryPassword?: string;
	loginUrl: string;
	role?: string;
}

export class MailService {
	private resendClient: Resend | null = null;
	private transporter: Transporter | null = null;
	private initialized = false;

	private init() {
		if (this.initialized) return;

		// 1. Check for Resend API Key
		const resendApiKey =
			process.env.RESEND_API_KEY ||
			(process.env.SMTP_PASSWORD?.startsWith("re_") ? process.env.SMTP_PASSWORD : null);

		if (resendApiKey) {
			try {
				this.resendClient = new Resend(resendApiKey);
				console.log("[MailService] Initialized official Resend SDK");
			} catch (err) {
				console.error("[MailService] Failed to initialize Resend:", err);
			}
		}

		// 2. Check for SMTP credentials
		const host = process.env.SMTP_HOST;
		const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
		const secure = process.env.SMTP_SECURE === "true" || port === 465;
		const user = process.env.SMTP_USER;
		const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

		if (user && pass && !this.resendClient) {
			try {
				this.transporter = nodemailer.createTransport({
					host: host || "smtp.resend.com",
					port,
					secure,
					auth: { user, pass },
				});
				console.log("[MailService] Configured SMTP transporter with:", host || "smtp.resend.com", user);
			} catch (error) {
				console.error("[MailService] Failed to create nodemailer transporter:", error);
			}
		}

		this.initialized = true;
	}

	private getFromAddress(): string {
		if (this.resendClient) {
			return process.env.RESEND_FROM || "Taskboard <onboarding@resend.dev>";
		}
		return process.env.SMTP_FROM || `"Taskboard" <${process.env.SMTP_USER || "onboarding@resend.dev"}>`;
	}

	private async dispatchEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
		this.init();
		const from = this.getFromAddress();

		// A. Try Resend SDK
		if (this.resendClient) {
			try {
				const { data, error } = await this.resendClient.emails.send({
					from,
					to: [to],
					subject,
					html,
					text,
				});

				if (error) {
					console.error("[MailService: Resend Error]", error);
					// If Resend fails (e.g. testing with unverified email on free tier), fallback to console log
					console.warn(
						`[MailService Fallback Note] Resend free tier only sends to registered email unless domain is verified. Error message: ${error.message}`,
					);
					return false;
				}

				console.log(`[MailService: Resend] Email delivered to ${to}. ID: ${data?.id}`);
				return true;
			} catch (err: any) {
				console.error("[MailService: Resend Exception]", err?.message || err);
				return false;
			}
		}

		// B. Try Nodemailer SMTP
		if (this.transporter) {
			try {
				const info = await this.transporter.sendMail({
					from,
					to,
					subject,
					html,
					text,
				});
				console.log(`[MailService: SMTP] Email sent to ${to}. MessageId: ${info.messageId}`);
				return true;
			} catch (error: any) {
				console.error(`[MailService: SMTP Failed] Failed to send email to ${to}:`, error?.message || error);
				return false;
			}
		}

		// C. Dev console fallback
		console.log(`\n=================================================`);
		console.log(`[MAIL SERVICE - DEV MODE / NO PROVIDER]`);
		console.log(`To: ${to}`);
		console.log(`Subject: ${subject}`);
		console.log(`Body excerpt: ${text.slice(0, 150)}...`);
		console.log(`=================================================\n`);
		return true;
	}

	/**
	 * Send Password Reset Link Email
	 */
	async sendPasswordResetEmail({ to, name, resetUrl }: SendPasswordResetOptions): Promise<boolean> {
		const recipientName = name || "there";
		const subject = "Reset your Taskboard password";

		const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #1e293b;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #1e88e5;
      padding: 28px 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      margin: 0;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #1e88e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 13px 28px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(30, 136, 229, 0.25);
    }
    .btn:hover {
      background-color: #1565c0;
    }
    .link-alt {
      word-break: break-all;
      font-size: 13px;
      color: #64748b;
      margin-top: 24px;
      padding: 12px;
      background-color: #f1f5f9;
      border-radius: 6px;
    }
    .link-alt a {
      color: #1e88e5;
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 28px 0;
    }
    .footer {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Taskboard</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello ${recipientName},</p>
      <p class="text">
        We received a request to reset the password for your Taskboard account. Click the button below to set a new password:
      </p>

      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
      </div>

      <p class="text">
        This link is valid for <strong>30 minutes</strong>. If you did not request this password reset, please disregard this email or contact support if you have concerns.
      </p>

      <div class="divider"></div>

      <div class="link-alt">
        If the button above does not work, copy and paste this link into your web browser:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </div>

      <div class="footer" style="margin-top: 24px;">
        &copy; ${new Date().getFullYear()} Taskboard. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
`;

		const text = `
Hello ${recipientName},

We received a request to reset your password for Taskboard.

Reset your password using the link below (valid for 30 minutes):
${resetUrl}

If you did not request a password reset, you can safely ignore this email.

Regards,
Taskboard Team
`;

		return this.dispatchEmail(to, subject, html, text);
	}

	/**
	 * Send Welcome / Account Creation Email when Admin creates a member
	 */
	async sendMemberWelcomeEmail({
		to,
		name,
		temporaryPassword,
		loginUrl,
		role = "Member",
	}: SendMemberWelcomeOptions): Promise<boolean> {
		const recipientName = name || "Team Member";
		const subject = "Welcome to Taskboard - Your Account Details";

		const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Taskboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #1e293b;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #1e88e5;
      padding: 28px 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 22px;
      margin: 0;
      font-weight: 700;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 20px;
    }
    .cred-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .cred-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .cred-row:last-child {
      margin-bottom: 0;
    }
    .cred-label {
      color: #64748b;
      font-weight: 500;
    }
    .cred-val {
      color: #0f172a;
      font-family: monospace;
      font-size: 15px;
      font-weight: 700;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #1e88e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 13px 28px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(30, 136, 229, 0.25);
    }
    .footer {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Taskboard</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello ${recipientName},</p>
      <p class="text">
        An administrator has created a <strong>${role}</strong> account for you on Taskboard. You can now log in to collaborate on projects and track tasks.
      </p>

      <div class="cred-box">
        <div class="cred-row">
          <span class="cred-label">Email:</span>
          <span class="cred-val">${to}</span>
        </div>
        ${
			temporaryPassword
				? `<div class="cred-row">
          <span class="cred-label">Temporary Password:</span>
          <span class="cred-val">${temporaryPassword}</span>
        </div>`
				: ""
		}
      </div>

      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank" rel="noopener noreferrer">Log In to Taskboard</a>
      </div>

      <p class="text" style="font-size: 13px; color: #64748b;">
        * For security, you will be prompted to change your temporary password when you log in for the first time.
      </p>

      <div class="footer" style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        &copy; ${new Date().getFullYear()} Taskboard. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
`;

		const text = `
Hello ${recipientName},

An administrator has created a ${role} account for you on Taskboard.

Login Details:
Email: ${to}
Temporary Password: ${temporaryPassword || "Contact your administrator"}
Login URL: ${loginUrl}

Please log in and update your password upon your first sign in.

Regards,
Taskboard Team
`;

		return this.dispatchEmail(to, subject, html, text);
	}
}

export const mailService = new MailService();
