import React from 'react';
import { CheckCircle, XCircle, MessageCircle, Package, Clock } from 'lucide-react';

interface Order {
  id: string;
  customer: string;
  farmer: string;
  products: string[];
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'in_discussion' | 'completed';
  date: string;
}

interface OrderTableProps {
  orders: Order[];
  onStatusChange?: (orderId: string, newStatus: Order['status']) => void;
}

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_discussion':
        return <MessageCircle className="h-5 w-5 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: // pending
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_discussion':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-indigo-100 text-indigo-800';
      default: // pending
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Seller
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Products
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.customer}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.farmer}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex flex-wrap gap-1">
                  {order.products.map((product) => (
                    <span
                      key={product}
                      className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${order.total.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  {onStatusChange ? (
                    <select
                      value={order.status}
                      onChange={(e) => onStatusChange(order.id, e.target.value as Order['status'])}
                      className={`ml-2 text-sm rounded-full px-2 py-1 ${getStatusColor(order.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_discussion">In Discussion</option>
                      <option value="accepted">Accepted</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}