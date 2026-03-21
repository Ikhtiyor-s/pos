import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/store/menu';
import ScanScreen from '@/screens/ScanScreen';
import MenuScreen from '@/screens/MenuScreen';
import CartScreen from '@/screens/CartScreen';
import OrderStatusScreen from '@/screens/OrderStatusScreen';

function App() {
  const { table, orderId, showCart, loadMenu } = useMenuStore();

  useEffect(() => {
    // Parse QR code from URL
    const url = new URL(window.location.href);

    // Support /table/:qrCode pattern
    const pathMatch = url.pathname.match(/\/table\/(.+)/);
    if (pathMatch) {
      loadMenu(pathMatch[1]);
      return;
    }

    // Support ?table=xxx query param
    const tableParam = url.searchParams.get('table');
    if (tableParam) {
      loadMenu(tableParam);
    }
  }, [loadMenu]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {orderId ? (
          <OrderStatusScreen key="order-status" />
        ) : !table ? (
          <ScanScreen key="scan" />
        ) : showCart ? (
          <CartScreen key="cart" />
        ) : (
          <MenuScreen key="menu" />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
