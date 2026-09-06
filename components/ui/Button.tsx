import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    /* Zoho Sprints base: 4px radius, Roboto-weight labels, smooth transitions */
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E88E5]/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      /* Solid Zoho blue — primary action */
      primary:
        "bg-[#1E88E5] text-white hover:bg-[#1876C4] shadow-[0_1px_3px_rgba(30,136,229,0.25)]",
      /* Outline — secondary action */
      secondary:
        "bg-white text-[#33475B] border border-[#E0E3E8] hover:bg-[#F5F6F8] hover:border-[#C8CDD4]",
      /* Ghost — subtle text button */
      ghost:
        "bg-transparent text-[#1E88E5] hover:bg-[#E3F2FD]",
      /* Danger — destructive */
      danger:
        "bg-[#E53935] text-white hover:bg-[#C62828]",
      /* Outline blue — filter/group style buttons */
      outline:
        "bg-white text-[#1E88E5] border border-[#90CAF9] hover:bg-[#E3F2FD]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-5 py-2.5 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";
