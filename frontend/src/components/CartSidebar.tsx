import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import CheckoutModal from './CheckoutModal';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: 'customer' | 'admin' | 'store_owner';
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  storeId?: string;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, user, storeId }) => {
  const { state, updateQuantity, removeFromCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    notes: ''
  });
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Filter items by store if storeId is provided
  const cartItems = storeId 
    ? state.items.filter(item => item.store_id === parseInt(storeId))
    : state.items;

  const cartTotal = cartItems.reduce((total, item) => total + (item.quantity * item.price), 0);

  const handleQuantityChange = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      updateQuantity(id, quantity);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingOrder(true);

    try {
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price_per_item: item.price
        })),
        customer_info: checkoutData,
        total_amount: cartTotal
      };

      const token = localStorage.getItem('afrozy-market-token');
      const response = await fetch('https://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        setOrderSuccess(true);
        // Clear cart items for this store
        cartItems.forEach(item => removeFromCart(item.id));
      } else {
        throw new Error('Failed to process order');
      }
    } catch (error) {
      console.error('Order processing error:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const resetCheckout = () => {
    setShowCheckout(false);
    setOrderSuccess(false);
    setCheckoutData({
      fullName: user?.full_name || '',
      email: user?.email || '',
      phone: '',
      address: '',
      notes: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {orderSuccess ? 'Order Confirmed!' : showCheckout ? 'Checkout' : 'Shopping Cart'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {orderSuccess ? (
              // Order Success
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">Order Placed Successfully!</h3>
                <p className="mb-6 text-gray-600">
                  Thank you for your order. You will receive a confirmation email shortly.
                </p>
                <button
                  onClick={() => {
                    resetCheckout();
                    onClose();
                  }}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Continue Shopping
                </button>
              </div>
            ) : showCheckout ? (
              // Checkout Form
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={checkoutData.fullName}
                    onChange={(e) => setCheckoutData({...checkoutData, fullName: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={checkoutData.email}
                    onChange={(e) => setCheckoutData({...checkoutData, email: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    required
                    value={checkoutData.phone}
                    onChange={(e) => setCheckoutData({...checkoutData, phone: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                  <textarea
                    required
                    rows={3}
                    value={checkoutData.address}
                    onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={checkoutData.notes}
                    onChange={(e) => setCheckoutData({...checkoutData, notes: e.target.value})}
                    placeholder="Special instructions for your order"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="rounded-md border border-gray-200 p-4">
                  <h4 className="font-medium text-gray-900">Order Summary</h4>
                  <div className="mt-2 space-y-1">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Back to Cart
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingOrder}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isProcessingOrder ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </form>
            ) : (
              // Cart Items
              <div>
                {cartItems.length === 0 ? (
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
                    </svg>
                    <p className="mt-2">Your cart is empty</p>
                    <p className="text-sm text-gray-400">Add some products to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                          <p className="text-sm text-gray-600">${item.price}</p>
                          <div className="flex items-center mt-1">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                            >
                              -
                            </button>
                            <span className="mx-2 text-sm">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock_quantity}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!orderSuccess && cartItems.length > 0 && !showCheckout && (
            <div className="border-t border-gray-200 px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={() => {
          setIsCheckoutModalOpen(false);
          onClose();
        }}
      />
    </div>
  );
};

export default CartSidebar;