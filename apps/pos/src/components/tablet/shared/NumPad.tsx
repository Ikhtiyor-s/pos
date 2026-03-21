import React from 'react';
import { cn } from '../../../lib/utils';
import { Delete, CornerDownLeft, X } from 'lucide-react';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function NumPad({ value, onChange, onSubmit }: NumPadProps) {
  const handleDigit = (digit: string) => {
    onChange(value + digit);
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const btnBase = cn(
    'min-h-[64px] min-w-[64px] rounded-xl font-bold text-xl',
    'flex items-center justify-center',
    'transition-all duration-100 active:scale-[0.94] select-none touch-manipulation',
    'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800',
    'dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-100'
  );

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '.'];

  return (
    <div className="flex flex-col gap-3">
      {/* Display */}
      <div
        className={cn(
          'min-h-[56px] px-4 py-3 rounded-xl text-right text-2xl font-mono font-bold',
          'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          'border border-gray-200 dark:border-gray-700'
        )}
      >
        {value ? Number(value).toLocaleString('uz-UZ') : '0'}
      </div>

      {/* Keys */}
      <div className="grid grid-cols-4 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className={cn(btnBase, key === '000' && 'text-base')}
            onClick={() => handleDigit(key)}
          >
            {key}
          </button>
        ))}

        {/* Right column action buttons alongside rows */}
      </div>

      {/* Action row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={cn(btnBase, 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:hover:bg-red-800/50 dark:text-red-400')}
          onClick={handleClear}
        >
          <X size={24} />
        </button>
        <button
          type="button"
          className={cn(btnBase, 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900/40 dark:hover:bg-yellow-800/50 dark:text-yellow-400')}
          onClick={handleBackspace}
        >
          <Delete size={24} />
        </button>
        <button
          type="button"
          className={cn(
            btnBase,
            'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
            'dark:bg-green-500 dark:hover:bg-green-600'
          )}
          onClick={onSubmit}
        >
          <CornerDownLeft size={24} />
        </button>
      </div>
    </div>
  );
}
