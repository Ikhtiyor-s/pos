import React from 'react';
import { cn } from '../../../lib/utils';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700',
  secondary:
    'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-100',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700',
  success:
    'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white dark:bg-green-500 dark:hover:bg-green-600 dark:active:bg-green-700',
};

const sizeStyles: Record<string, string> = {
  sm: 'min-h-[44px] px-3 py-2 text-sm rounded-lg',
  md: 'min-h-[48px] px-4 py-3 text-base rounded-xl',
  lg: 'min-h-[56px] px-6 py-4 text-lg rounded-xl',
};

export default function TouchButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  disabled,
  ...props
}: TouchButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 font-semibold transition-all duration-100',
        'active:scale-[0.96] select-none touch-manipulation',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
