import React, { useState } from 'react';
import { OrderTable } from '../components/orders/OrderTable';
import { useAuthStore } from '../store/authStore';

const mockOrders = [
  {
    id: "ORD001",
    customer: "John Doe",
    farmer: "Green Valley Farm",
    products: ["Organic Vegetables", "Fruits"],
    total: 125.50,
    status: "new" as const,
    date: "2024-03-10"
  },
  {
    id: "ORD002",
    customer: "Jane Smith",
    farmer: "Sunrise Dairy",
    products: ["Milk", "Cheese"],
    total: 45.75,
    status: "in_discussion" as const,
    date: "2024-03-11"
  },
  {
    id: "ORD003",
    customer: "Mike Johnson",
    farmer: "Fresh Fields",
    products: ["Honey", "Eggs"],
    total: 35.25,
    status: "cancelled" as const,
    date: "2024-03-12"
  }
];

export function Orders() {
  const [orders, setOrders] = useState(mockOrders);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const user = useAuthStore((state) => state.user);

  const handleStatusChange = (orderId: string, newStatus: typeof orders[0]['status']) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    
    const orderDate = new Date(order.date);
    const now = new Date();
    
    switch (dateFilter) {
      case '7days':
        return orderDate >= new Date(now.setDate(now.getDate() - 7));
      case '30days':
        return orderDate >= new Date(now.setDate(now.getDate() - 30));
      case '3months':
        return orderDate >= new Date(now.setMonth(now.getMonth() - 3));
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_discussion">In Discussion</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
          </select>
        </div>
      </div>

      <OrderTable 
        orders={filteredOrders} 
        onStatusChange={user?.role === 'super_admin' ? handleStatusChange : undefined}
      />
    </div>
  );
}