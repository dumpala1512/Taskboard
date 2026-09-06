import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, leftIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[#33475B] dark:text-slate-200 mb-1.5"
          >
            {label}{" "}
            {props.required && <span className="text-[#E53935]">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9EAAB7] dark:text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`block w-full rounded border text-sm text-[#33475B] dark:text-slate-100 bg-white dark:bg-[#1A233A] placeholder-[#9EAAB7] dark:placeholder-slate-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/30 focus:border-[#1E88E5] disabled:opacity-50 disabled:bg-[#F5F6F8] dark:disabled:bg-slate-800/50 ${
              leftIcon ? "pl-10" : "pl-3"
            } pr-3 py-2 ${
              error
                ? "border-[#E53935] focus:ring-[#E53935]/30 focus:border-[#E53935]"
                : "border-[#E0E3E8] dark:border-[#222F49]"
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-[#E53935]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
