import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import DeliveryForm, { DeliveryInfo } from './DeliveryForm';
import { useCart } from '../context/CartContext';
import axios from '../utils/axios';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type CheckoutStep = 'delivery' | 'payment';

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { state, getTotalPrice, user } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset to delivery step when modal opens
      setCurrentStep('delivery');
      setDeliveryInfo(null);
      setClientSecret('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const createPaymentIntent = async (delivery: DeliveryInfo) => {
    try {
      setLoading(true);
      setError(null);

      const headers = user 
        ? {}  // For authenticated users, session will be sent via cookies
        : { 'X-Session-Id': getSessionId() };

      const response = await axios.post(
        '/checkout/process',
        { deliveryInfo: delivery },
        { 
          headers
          // withCredentials is set globally in axios config
        }
      );

      if (response.data.success) {
        setClientSecret(response.data.data.clientSecret);
        setCurrentStep('payment');
      } else {
        setError(response.data.message || 'Failed to create payment intent');
      }
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      setError(
        error.response?.data?.message || 
        'Failed to initialize checkout. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getSessionId = (): string => {
    let sessionId = localStorage.getItem('afrozy_session_id');
    if (!sessionId) {
      sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('afrozy_session_id', sessionId);
    }
    return sessionId;
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      const headers = user 
        ? {}  // For authenticated users, session will be sent via cookies
        : { 'X-Session-Id': getSessionId() };

      await axios.post(
        '/checkout/confirm',
        { paymentIntentId: paymentIntent.id },
        { 
          headers
          // withCredentials is set globally in axios config
        }
      );

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
    }
  };

  const handleDeliverySubmit = (delivery: DeliveryInfo) => {
    setDeliveryInfo(delivery);
    createPaymentIntent(delivery);
  };

  const handleBackToDelivery = () => {
    setCurrentStep('delivery');
    setClientSecret('');
    setError(null);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Tab': {
        display: 'none', // Hide tabs since we only have cards
      },
      '.TabIcon': {
        display: 'none',
      },
      '.TabLabel': {
        display: 'none',
      },
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch (currentStep) {
      case 'delivery':
        return 'Checkout - Delivery Information';
      case 'payment':
        return 'Checkout - Payment';
      default:
        return 'Checkout';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{getStepTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'delivery' ? 'text-blue-600' : 'text-green-600'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'delivery' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-green-600 text-white'
              }`}>
                {currentStep === 'payment' ? '✓' : '1'}
              </div>
              <span className="text-sm font-medium">Delivery Info</span>
            </div>
            
            <div className={`flex-1 h-0.5 ${
              currentStep === 'payment' ? 'bg-green-600' : 'bg-gray-200'
            }`} />
            
            <div className={`flex items-center space-x-2 ${
              currentStep === 'payment' ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'payment' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Payment</span>
            </div>
          </div>
        </div>

        {state.items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Your cart is empty</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Order Summary - Show on payment step */}
            {currentStep === 'payment' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Delivery Summary */}
                {deliveryInfo && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Delivery Address</h4>
                    <div className="text-sm text-gray-600">
                      <p>{deliveryInfo.fullName}</p>
                      <p>{deliveryInfo.address}</p>
                      <p>{deliveryInfo.city}, {deliveryInfo.state} {deliveryInfo.zipCode}</p>
                      <p>{deliveryInfo.country}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Render appropriate step */}
            {currentStep === 'delivery' ? (
              <DeliveryForm
                onSubmit={handleDeliverySubmit}
                onBack={onClose}
                loading={loading}
              />
            ) : currentStep === 'payment' ? (
              <>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : clientSecret ? (
                  <>
                    <Elements options={options} stripe={stripePromise}>
                      <CheckoutForm
                        clientSecret={clientSecret}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                      />
                    </Elements>
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={handleBackToDelivery}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        ← Edit Delivery Information
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Failed to initialize payment</p>
                    <button
                      onClick={() => deliveryInfo && createPaymentIntent(deliveryInfo)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;