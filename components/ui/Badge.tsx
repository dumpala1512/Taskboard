import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "default";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
  ...props
}) => {
  /* Zoho Sprints: rounded-full pills, pastel tint bg, matching darker text */
  const variants = {
    success: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
    warning: "bg-[#FFF3E0] text-[#E65100] border border-[#FFCC80]",
    error:   "bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A]",
    info:    "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
    default: "bg-[#F5F6F8] text-[#33475B] border border-[#E0E3E8]",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
