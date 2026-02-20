import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
  className,
}: PaginationProps) {
  // Sahifalar ro'yxatini yaratish
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // Ko'rsatiladigan sahifalar soni

    if (totalPages <= showPages) {
      // Agar jami sahifalar soni kam bo'lsa
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Boshlanish va tugash nuqtalarini hisoblash
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        end = showPages;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - showPages + 1;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-4',
        className
      )}
    >
      {/* Ma'lumot */}
      <div className="text-sm text-gray-500">
        {totalItems > 0 ? (
          <>
            <span className="font-medium text-gray-900">{startItem}</span>
            {' - '}
            <span className="font-medium text-gray-900">{endItem}</span>
            {' / '}
            <span className="font-medium text-gray-900">{totalItems}</span>
            {' ta mahsulot'}
          </>
        ) : (
          'Mahsulot topilmadi'
        )}
      </div>

      {/* Sahifa tugmalari */}
      <div className="flex items-center gap-1">
        {/* Birinchi sahifa */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          <ChevronsLeft size={18} />
        </button>

        {/* Oldingi sahifa */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Sahifa raqamlari */}
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={cn(
              'flex h-9 min-w-[36px] items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-orange-500 text-white'
                : page === '...'
                  ? 'cursor-default text-gray-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            {page}
          </button>
        ))}

        {/* Keyingi sahifa */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          <ChevronRight size={18} />
        </button>

        {/* Oxirgi sahifa */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
}
