import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  clientSecret,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart, getTotalPrice } = useCart();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasAttemptedPayment, setHasAttemptedPayment] = useState(false);

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Payment succeeded!');
            onSuccess(paymentIntent);
            break;
          case 'processing':
            setMessage('Your payment is processing.');
            break;
          case 'requires_payment_method':
            // Don't show error message on initial load - this is the normal state
            // Only show error if there was a previous payment attempt
            if (paymentIntent.last_payment_error || hasAttemptedPayment) {
              setMessage('Your payment was not successful, please try again.');
            }
            break;
          default:
            // Only show error for unexpected statuses after payment attempt
            if (paymentIntent.last_payment_error) {
              setMessage('Something went wrong.');
            }
            break;
        }
      }
    });
  }, [stripe, clientSecret, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setHasAttemptedPayment(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'Please check your card details and try again.');
        onError(error.message || 'Payment failed');
      } else {
        setMessage('An unexpected error occurred. Please try again.');
        onError('An unexpected error occurred');
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment succeeded!');
      onSuccess(paymentIntent);
      await clearCart();
    } else if (paymentIntent && paymentIntent.status === 'processing') {
      setMessage('Your payment is being processed...');
    }

    setIsLoading(false);
  };

  const paymentElementOptions = {
    layout: {
      type: 'auto' as const,
    },
    paymentMethodOrder: ['card'],
    fields: {
      billingDetails: 'auto' as const,
    },
    terms: {
      card: 'auto' as const,
    },
  };

  return (
    <div className="checkout-form-container">
      <div className="checkout-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Order</h2>
        <div className="text-lg font-semibold text-gray-700">
          Total: ${getTotalPrice().toFixed(2)}
        </div>
      </div>

      <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement 
          id="payment-element" 
          options={paymentElementOptions}
        />
        
        <button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors duration-200 ${
            isLoading || !stripe || !elements
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200'
          }`}
        >
          <span id="button-text">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              `Pay $${getTotalPrice().toFixed(2)}`
            )}
          </span>
        </button>
        
        {message && (
          <div className={`text-sm p-3 rounded-lg ${
            message.includes('succeeded') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`} id="payment-message">
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default CheckoutForm;