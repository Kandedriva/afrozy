import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: 'customer' | 'admin' | 'store_owner';
  store?: any;
}

interface OrdersProps {
  user: User;
}

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

interface Order {
  id: number;
  orderNumber?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  shippingAddress?: string;
  paymentMethod: string;
  orderDate: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  itemCount: number;
}

const Orders: React.FC<OrdersProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | Order['status']>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/orders');
      
      if (response.data.success) {
        // Transform API data to match our interface
        const transformedOrders = response.data.data.orders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          items: [], // Will be populated when order details are fetched
          total: order.total,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          orderDate: order.orderDate,
          estimatedDelivery: order.estimatedDelivery,
          trackingNumber: order.trackingNumber,
          itemCount: order.itemCount
        }));
        
        setOrders(transformedOrders);
      } else {
        setError(response.data.message || 'Failed to fetch orders');
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again later.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const response = await axios.get(`/orders/${orderId}`);
      
      if (response.data.success) {
        const orderData = response.data.data;
        const detailedOrder: Order = {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          status: orderData.status,
          items: orderData.items.map((item: any) => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl || '/placeholder-product.png'
          })),
          total: orderData.total,
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod,
          orderDate: orderData.orderDate,
          estimatedDelivery: orderData.estimatedDelivery,
          trackingNumber: orderData.trackingNumber,
          itemCount: orderData.items.length
        };
        
        setSelectedOrder(detailedOrder);
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
      setError('Failed to load order details.');
    }
  };

  const filteredOrders = orders.filter(order => 
    selectedStatus === 'all' || order.status === selectedStatus
  );

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'confirmed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'shipped':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'delivered':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedOrder) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Orders</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Order {selectedOrder.orderNumber}</h3>
                  <p className="text-gray-600">Placed on {formatDate(selectedOrder.orderDate)}</p>
                </div>
                <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  <span className="capitalize">{selectedOrder.status}</span>
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Order Items</h4>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{item.productName}</h5>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${item.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Total: ${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedOrder.trackingNumber && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Tracking Information</h4>
                  <p className="text-blue-800">Tracking Number: <span className="font-mono">{selectedOrder.trackingNumber}</span></p>
                  <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Track Package →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">Free</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Shipping Address</h4>
              <p className="text-gray-600">{selectedOrder.shippingAddress}</p>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Payment Method</h4>
              <p className="text-gray-600">{selectedOrder.paymentMethod}</p>
            </div>

            {selectedOrder.estimatedDelivery && (
              <div className="bg-white border rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Estimated Delivery</h4>
                <p className="text-gray-600">{formatDate(selectedOrder.estimatedDelivery)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading orders</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchUserOrders}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
          <p className="text-gray-600 mt-1">Track and manage your orders</p>
        </div>
        <button
          onClick={fetchUserOrders}
          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'processing', label: 'Processing' },
          { key: 'shipped', label: 'Shipped' },
          { key: 'delivered', label: 'Delivered' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedStatus === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-4">When you place your first order, it will appear here with tracking and delivery information.</p>
            <button 
              onClick={() => window.history.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => fetchOrderDetails(order.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Order {order.orderNumber}</h3>
                    <p className="text-sm text-gray-600">Placed on {formatDate(order.orderDate)}</p>
                  </div>
                  <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status}</span>
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${order.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {order.items && order.items.length > 0 ? (
                  <>
                    {order.items.slice(0, 3).map((item) => (
                      <img
                        key={item.id}
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-sm text-gray-600">+{order.items.length - 3}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1"></div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View Details →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Orders;