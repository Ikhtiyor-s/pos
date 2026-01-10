import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TablesPage from './pages/TablesPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';

export default function App() {
  return (
    <div className="h-full w-full bg-gray-50">
      <Routes>
        <Route path="/" element={<Navigate to="/tables" replace />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/menu/:tableId" element={<MenuPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </div>
  );
}
