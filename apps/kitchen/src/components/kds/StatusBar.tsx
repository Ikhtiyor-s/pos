import { useState, useEffect } from 'react';
import { Clock, Flame, ChefHat, CheckCircle, Package, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import type { KDSOrder } from './OrderCard';

// ==========================================
// KDS STATUS BAR — Top bar with live stats
// Katta shriftlar, real-time yangilanish
// ==========================================

interface StatusBarProps {
  orders: KDSOrder[];
  businessName: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isConnected: boolean;
}

export default function StatusBar({
  orders,
  businessName,
  soundEnabled,
  onToggleSound,
  isConnected,
}: StatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const newCount = orders.filter(o => o.status === 'NEW').length;
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  const totalCount = orders.length;

  // Eng uzoq kutayotgan buyurtma
  const oldestOrder = orders
    .filter(o => o.status !== 'READY')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  const longestWait = oldestOrder
    ? Math.floor((Date.now() - oldestOrder.createdAt.getTime()) / 60000)
    : 0;

  // Shoshilinch buyurtmalar (20+ min)
  const urgentCount = orders.filter(o => {
    const min = Math.floor((Date.now() - o.createdAt.getTime()) / 60000);
    return min > 20 && o.status !== 'READY';
  }).length;

  const timeStr = time.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Business name + time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ChefHat size={28} className="text-orange-400" />
            <div>
              <h1 className="text-xl font-black text-white leading-tight">{businessName}</h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Oshxona Display</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-700" />

          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white">{timeStr}</div>
            <div className="text-xs text-gray-500">{dateStr}</div>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-3">
          {/* Yangi */}
          <StatBadge
            icon={<Package size={18} />}
            count={newCount}
            label="YANGI"
            color="blue"
            pulse={newCount > 0}
          />

          {/* Tayyorlanmoqda */}
          <StatBadge
            icon={<ChefHat size={18} />}
            count={preparingCount}
            label="TAYYORLANMOQDA"
            color="orange"
            pulse={false}
          />

          {/* Tayyor */}
          <StatBadge
            icon={<CheckCircle size={18} />}
            count={readyCount}
            label="TAYYOR"
            color="emerald"
            pulse={readyCount > 0}
          />

          {/* Divider */}
          <div className="h-8 w-px bg-gray-700" />

          {/* Jami */}
          <div className="text-center">
            <div className="text-3xl font-black text-white">{totalCount}</div>
            <div className="text-[10px] text-gray-500 uppercase">JAMI</div>
          </div>

          {/* Urgent */}
          {urgentCount > 0 && (
            <>
              <div className="h-8 w-px bg-gray-700" />
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg animate-pulse">
                <Flame size={18} />
                <span className="text-lg font-black">{urgentCount}</span>
                <span className="text-xs">SHOSHILINCH</span>
              </div>
            </>
          )}

          {/* Longest wait */}
          {longestWait > 0 && (
            <>
              <div className="h-8 w-px bg-gray-700" />
              <div className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                ${longestWait > 20 ? 'text-red-400 bg-red-500/10' :
                  longestWait > 15 ? 'text-orange-400 bg-orange-500/10' :
                  'text-gray-400 bg-gray-800'}
              `}>
                <Clock size={16} />
                <span className="font-bold">{longestWait} daq</span>
                <span className="text-xs opacity-75">max</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm
            ${isConnected ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10 animate-pulse'}
          `}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-xs font-medium">
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            className={`
              p-2.5 rounded-lg transition-colors
              ${soundEnabled
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-gray-500 bg-gray-800 hover:bg-gray-700'}
            `}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Stat Badge Component ---

function StatBadge({
  icon,
  count,
  label,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  color: 'blue' | 'orange' | 'emerald' | 'red';
  pulse: boolean;
}) {
  const colorMap = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/30' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'ring-orange-500/30' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/30' },
  };

  const c = colorMap[color];

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-lg
      ${c.bg} ${c.text}
      ${pulse && count > 0 ? `ring-1 ${c.ring}` : ''}
    `}>
      {icon}
      <span className="text-2xl font-black">{count}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-75">{label}</span>
    </div>
  );
}
