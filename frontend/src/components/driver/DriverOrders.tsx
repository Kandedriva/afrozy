import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

interface Order {
  id: number;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  total: number;
  shippingAddress: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  assignedAt: string;
  estimatedDelivery: string;
}

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  price: number;
}

interface Driver {
  id: number;
  driverId: string;
  fullName: string;
  email: string;
  status: string;
}

interface DriverOrdersProps {
  driver: Driver;
}

const DriverOrders: React.FC<DriverOrdersProps> = ({ driver }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await axios.get(
        `${API_BASE_URL}/drivers/orders?${params.toString()}`,
{}
      );

      if (response.data.success) {
        setOrders(response.data.data.orders);
      } else {
        setError(response.data.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch orders';
      setError(errorMessage);
      
      // If it's a token-related error, clear stored auth data
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Driver authentication error, clearing stored data:', errorMessage);
        localStorage.removeItem('afrozy-driver-data');
        // Reload the page to trigger re-authentication
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdating(orderId);

      const response = await axios.put(
        `${API_BASE_URL}/drivers/orders/${orderId}/status`,
        { status: newStatus },
{}
      );

      if (response.data.success) {
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus as any }
            : order
        ));
        
        // Update selected order if it's the one being updated
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        }
      } else {
        setError(response.data.message || 'Failed to update order status');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update order status';
      setError(errorMessage);
      
      // If it's a token-related error, clear stored auth data
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Driver authentication error, clearing stored data:', errorMessage);
        localStorage.removeItem('afrozy-driver-data');
        // Reload the page to trigger re-authentication
        window.location.reload();
      }
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'picked_up':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_transit':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNextStatusAction = (currentStatus: string) => {
    switch (currentStatus) {
      case 'assigned':
        return { status: 'picked_up', label: 'Mark as Picked Up', color: 'bg-yellow-600 hover:bg-yellow-700' };
      case 'picked_up':
        return { status: 'in_transit', label: 'Mark as In Transit', color: 'bg-orange-600 hover:bg-orange-700' };
      case 'in_transit':
        return { status: 'delivered', label: 'Mark as Delivered', color: 'bg-green-600 hover:bg-green-700' };
      default:
        return null;
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Delivery Orders</h2>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {statusFilter === 'all' 
              ? 'You have no delivery orders assigned yet.' 
              : `No orders with status "${statusFilter}" found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const nextAction = getNextStatusAction(order.status);
            
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <p><strong>Customer:</strong> {order.customerName}</p>
                        <p><strong>Phone:</strong> {order.customerPhone}</p>
                      </div>
                      <div>
                        <p><strong>Address:</strong> {order.shippingAddress}</p>
                        <p><strong>Assigned:</strong> {new Date(order.assignedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      View Details
                    </button>
                    
                    {nextAction && (
                      <button
                        onClick={() => updateOrderStatus(order.id, nextAction.status)}
                        disabled={updating === order.id}
                        className={`px-4 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50 ${nextAction.color}`}
                      >
                        {updating === order.id ? 'Updating...' : nextAction.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Order #{selectedOrder.orderNumber}</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Customer Information</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                    <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                    <p><strong>Address:</strong> {selectedOrder.shippingAddress}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Order Items</h4>
                  <div className="border rounded divide-y">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="p-3 flex justify-between">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-right">
                    <p className="text-lg font-semibold">Total: ${selectedOrder.total.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Delivery Information</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </p>
                    <p><strong>Assigned At:</strong> {new Date(selectedOrder.assignedAt).toLocaleString()}</p>
                    <p><strong>Estimated Delivery:</strong> {new Date(selectedOrder.estimatedDelivery).toLocaleString()}</p>
                  </div>
                </div>

                {getNextStatusAction(selectedOrder.status) && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => {
                        const nextAction = getNextStatusAction(selectedOrder.status);
                        if (nextAction) {
                          updateOrderStatus(selectedOrder.id, nextAction.status);
                        }
                      }}
                      disabled={updating === selectedOrder.id}
                      className={`w-full py-2 text-white rounded-md transition-colors disabled:opacity-50 ${getNextStatusAction(selectedOrder.status)?.color}`}
                    >
                      {updating === selectedOrder.id ? 'Updating...' : getNextStatusAction(selectedOrder.status)?.label}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverOrders;