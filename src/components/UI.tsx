import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export { cn } from '../lib/utils';

export const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm", className)} {...props}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  size?: 'sm' | 'md' | 'lg',
  isLoading?: boolean
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white",
    outline: "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Input = ({ label, helper, error, className, ...props }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
    <input 
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm",
        error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500",
        className
      )}
      {...props}
    />
    {helper && <p className="text-[10px] text-slate-500">{helper}</p>}
    {error && <p className="text-xs text-rose-500">{error}</p>}
  </div>
);

export const Badge = ({ children, variant = 'neutral', className, ...props }: { children: React.ReactNode, variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info', className?: string } & React.HTMLAttributes<HTMLSpanElement>) => {
  const variants = {
    neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };

  return (
    <span 
      className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

export const ScaleImage = ({ src, alt, className, containerClassName }: any) => (
  <div className={cn("overflow-hidden", containerClassName)}>
    <img 
      src={src} 
      alt={alt} 
      className={cn("w-full h-full object-cover transition-transform duration-500 hover:scale-110", className)}
      referrerPolicy="no-referrer"
    />
  </div>
);
