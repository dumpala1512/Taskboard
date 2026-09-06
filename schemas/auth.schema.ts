import * as z from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(128, "Password must not exceed 128 characters.")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Must contain at least one number.")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character.");

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email address is required")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Password is required"),
});

export type SigninFormValues = z.infer<typeof signinSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(50, "Full name must not exceed 50 characters.")
      .regex(/^[A-Za-z\s'-]+$/, "Name can only contain letters, spaces, apostrophes, and hyphens."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email address is required.")
      .email("Enter a valid email address.")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
