import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, onChange, label, error, value, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
              'flex h-10 w-full appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-white',
              'ring-offset-slate-900 placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500/50',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
