import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Utensils } from 'lucide-react';
import { useMenuStore } from '@/store/menu';

export default function ScanScreen() {
  const [tableCode, setTableCode] = useState('');
  const { loadMenu, loading, error } = useMenuStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tableCode.trim()) {
      loadMenu(tableCode.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-orange-50 to-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="flex flex-col items-center w-full max-w-sm"
      >
        {/* Logo */}
        <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
          <Utensils className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Oshxona</h1>
        <p className="text-gray-500 mb-8">Onlayn menyu</p>

        {/* QR Code Icon */}
        <div className="w-32 h-32 border-2 border-dashed border-orange-300 rounded-2xl flex items-center justify-center mb-6 bg-orange-50/50">
          <QrCode className="w-16 h-16 text-orange-400" />
        </div>

        <p className="text-sm text-gray-500 mb-6 text-center">
          QR kodni skanerlang yoki stol raqamini kiriting
        </p>

        {/* Manual input */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <input
            type="text"
            value={tableCode}
            onChange={(e) => setTableCode(e.target.value)}
            placeholder="Stol raqami yoki QR kod"
            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400 transition-shadow"
          />

          <button
            type="submit"
            disabled={!tableCode.trim() || loading}
            className="w-full py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Yuklanmoqda...
              </span>
            ) : (
              "Menyuni ko'rish"
            )}
          </button>
        </form>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-red-500 text-center bg-red-50 px-4 py-2 rounded-lg"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
