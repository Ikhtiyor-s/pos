import { useState, useEffect } from 'react';
import { Timer, AlertTriangle, Flame } from 'lucide-react';

// ==========================================
// ORDER TIMER — Har bir buyurtma uchun real-time taymer
// Rang: yashil < 10 min, sariq < 15, to'q sariq < 20, qizil > 20
// ==========================================

interface OrderTimerProps {
  createdAt: Date;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function OrderTimer({ createdAt, size = 'md', showIcon = true }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      setElapsed(Math.floor((Date.now() - createdAt.getTime()) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Rang va holat
  let colorClass: string;
  let bgClass: string;
  let IconComponent = Timer;
  let isUrgent = false;
  let isPulsing = false;

  if (minutes < 10) {
    colorClass = 'text-emerald-400';
    bgClass = 'bg-emerald-500/10';
  } else if (minutes < 15) {
    colorClass = 'text-yellow-400';
    bgClass = 'bg-yellow-500/10';
  } else if (minutes < 20) {
    colorClass = 'text-orange-400';
    bgClass = 'bg-orange-500/10';
    IconComponent = AlertTriangle;
  } else {
    colorClass = 'text-red-400';
    bgClass = 'bg-red-500/15';
    IconComponent = Flame;
    isUrgent = true;
    isPulsing = true;
  }

  const sizeClasses = {
    sm: 'text-sm px-2 py-1 gap-1',
    md: 'text-lg px-3 py-1.5 gap-1.5',
    lg: 'text-2xl px-4 py-2 gap-2 font-bold',
  };

  const iconSize = { sm: 14, md: 18, lg: 24 };

  return (
    <div
      className={`
        inline-flex items-center rounded-lg font-mono
        ${sizeClasses[size]} ${colorClass} ${bgClass}
        ${isPulsing ? 'animate-pulse' : ''}
        transition-colors duration-500
      `}
    >
      {showIcon && <IconComponent size={iconSize[size]} />}
      <span>{timeStr}</span>
      {isUrgent && size !== 'sm' && (
        <span className="text-xs font-sans ml-1 opacity-75">KECHIKDI!</span>
      )}
    </div>
  );
}
