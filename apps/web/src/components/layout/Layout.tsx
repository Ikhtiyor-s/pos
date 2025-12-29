import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { QuickOrderModal } from '@/components/orders/QuickOrderModal';
import type { Order } from '@/types/order';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleNewOrderClick = () => {
    setIsQuickOrderModalOpen(true);
  };

  const handleOrderCreated = (order: Order) => {
    // Navigate to orders page after creating order
    navigate('/orders');
    console.log('Yangi buyurtma yaratildi:', order);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewOrder={handleNewOrderClick}
      />
      <main
        className={cn(
          'min-h-screen p-6 transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-72'
        )}
      >
        <Outlet />
      </main>

      {/* Tezkor buyurtma modali */}
      <QuickOrderModal
        isOpen={isQuickOrderModalOpen}
        onClose={() => setIsQuickOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}
