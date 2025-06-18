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
    <>
      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Order #{order.id.substring(0, 8)}...</h3>
                <p className="text-sm text-gray-500">{order.customer}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(order.status)}
                {onStatusChange ? (
                  <select
                    value={order.status}
                    onChange={(e) => onStatusChange(order.id, e.target.value as Order['status'])}
                    className={`text-xs rounded-full px-2 py-1 ${getStatusColor(order.status)}`}
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
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Seller:</span>
                <span className="text-gray-900">{order.farmer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Products:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {order.products.map((product) => (
                    <span
                      key={product}
                      className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span className="text-gray-900 font-medium">${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-900">{new Date(order.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Seller
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id.substring(0, 8)}...
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{order.customer}</div>
                      {/* Show seller info on smaller desktop screens */}
                      <div className="text-xs text-gray-400 xl:hidden mt-1">
                        Seller: {order.farmer}
                      </div>
                      {/* Show date on smaller desktop screens */}
                      <div className="text-xs text-gray-400 xl:hidden mt-1">
                        {new Date(order.date).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                    {order.farmer}
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
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
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}